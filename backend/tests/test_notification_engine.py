# 📂 FILE: backend/tests/test_notification_engine.py
import pytest
import json
from unittest.mock import patch
from fastapi import BackgroundTasks
from sqlalchemy import select

from app.models.employee import Employee
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.core.security import get_password_hash
from app.core.constants import ROLE_EMPLOYEE
from app.core.enums import NotificationType, NotificationChannel, NotificationStatus
from app.services.notification.service import notification_service
from app.services.background_job_service import BackgroundJobService
from tests.conftest import TestingSessionLocal


@pytest.fixture
def test_employee(db):
    """Fixture to insert a test employee."""
    emp = Employee(
        employee_code="EMP_ENGINE_001",
        full_name="Notification Tester",
        email="enginetest@example.com",
        password_hash=get_password_hash("testpass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@pytest.mark.anyio
async def test_task_assigned_flow(db, test_employee):
    # 1. Trigger Task Assigned event
    event = notification_service.create_event(
        event_type=NotificationType.TASKS,
        recipient_ids=[test_employee.id],
        payload={
            "task_title": "Implement Notification Engine",
            "actor_name": "Project Manager"
        }
    )

    # Trigger synchronous routing
    notification_service.trigger_event(db, event)

    # 2. Verify record in notifications database table
    stmt = select(Notification).where(Notification.employee_id == test_employee.id)
    notifs = list(db.scalars(stmt).all())
    
    # Defaults in resolve_channels fall back to IN_APP and EMAIL
    # So we should expect 2 notification records (one for IN_APP, one for EMAIL)
    assert len(notifs) == 2
    
    in_app_notif = next(n for n in notifs if n.channel == NotificationChannel.IN_APP.value)
    email_notif = next(n for n in notifs if n.channel == NotificationChannel.EMAIL.value)

    assert in_app_notif.title == "Task Assigned: Implement Notification Engine"
    assert in_app_notif.message == "You have been assigned to the task 'Implement Notification Engine' by Project Manager."
    assert in_app_notif.status == NotificationStatus.SENT.value
    assert in_app_notif.type == NotificationType.TASKS.value

    # Verify context_json is saved correctly
    payload_dict = json.loads(in_app_notif.context_json)
    assert payload_dict["task_title"] == "Implement Notification Engine"
    assert payload_dict["actor_name"] == "Project Manager"

    # Verify delivery log was recorded
    log_stmt = select(NotificationLog).where(NotificationLog.notification_id == in_app_notif.id)
    logs = list(db.scalars(log_stmt).all())
    assert len(logs) == 1
    assert logs[0].channel == NotificationChannel.IN_APP.value
    assert logs[0].delivery_status == NotificationStatus.SENT.value


@pytest.mark.anyio
async def test_vacation_approved_flow(db, test_employee):
    # Setup custom user preference: User only wants EMAIL for VACATION
    pref = NotificationPreference(
        employee_id=test_employee.id,
        notification_type=NotificationType.VACATION.value,
        channel=NotificationChannel.EMAIL.value,
        enabled=True
    )
    # Explicitly disable IN_APP for VACATION
    pref_in_app = NotificationPreference(
        employee_id=test_employee.id,
        notification_type=NotificationType.VACATION.value,
        channel=NotificationChannel.IN_APP.value,
        enabled=False
    )
    db.add(pref)
    db.add(pref_in_app)
    db.commit()

    # Trigger Vacation Approved event
    event = notification_service.create_event(
        event_type=NotificationType.VACATION,
        recipient_ids=[test_employee.id],
        payload={
            "start_date": "2026-07-20",
            "end_date": "2026-07-25",
            "status": "APPROVED"
        }
    )

    notification_service.trigger_event(db, event)

    # Check notification records
    stmt = select(Notification).where(
        Notification.employee_id == test_employee.id,
        Notification.type == NotificationType.VACATION.value
    )
    notifs = list(db.scalars(stmt).all())
    # Should only create 1 notification record since IN_APP is disabled and EMAIL is enabled
    assert len(notifs) == 1
    assert notifs[0].channel == NotificationChannel.EMAIL.value
    assert notifs[0].title == "Vacation Request Approved"
    assert "has been approved" in notifs[0].message


@pytest.mark.anyio
async def test_comment_added_flow(db, test_employee):
    # Trigger Comment Added event
    event = notification_service.create_event(
        event_type=NotificationType.COMMENTS,
        recipient_ids=[test_employee.id],
        payload={
            "task_title": "Fix Database Bug",
            "comment_body": "This issue is critical.",
            "actor_name": "QA Lead"
        }
    )

    notification_service.trigger_event(db, event)

    stmt = select(Notification).where(
        Notification.employee_id == test_employee.id,
        Notification.type == NotificationType.COMMENTS.value
    )
    notifs = list(db.scalars(stmt).all())
    # Default fallbacks: IN_APP & EMAIL
    assert len(notifs) == 2
    in_app = next(n for n in notifs if n.channel == NotificationChannel.IN_APP.value)
    assert in_app.title == "New Comment on Task: Fix Database Bug"
    assert in_app.message == "QA Lead added a comment: 'This issue is critical.'"


@pytest.mark.anyio
async def test_async_background_execution(db, test_employee):
    bg_tasks = BackgroundTasks()
    bg_service = BackgroundJobService(bg_tasks)

    event = notification_service.create_event(
        event_type=NotificationType.SYSTEM,
        recipient_ids=[test_employee.id],
        payload={
            "subject": "System Shutdown",
            "body": "Server maintenance starting in 10 minutes."
        }
    )

    notification_service.trigger_event_async(bg_service, event)
    # Check that a task was added
    assert len(bg_tasks.tasks) == 1

    # Run the background task using TestingSessionLocal patch
    with patch("app.database.SessionLocal", TestingSessionLocal):
        await bg_tasks()

    # Verify db records were persisted
    stmt = select(Notification).where(
        Notification.employee_id == test_employee.id,
        Notification.type == NotificationType.SYSTEM.value
    )
    notifs = list(db.scalars(stmt).all())
    assert len(notifs) == 2  # default: IN_APP & EMAIL
    in_app = next(n for n in notifs if n.channel == NotificationChannel.IN_APP.value)
    assert in_app.title == "System Shutdown"
    assert in_app.message == "Server maintenance starting in 10 minutes."

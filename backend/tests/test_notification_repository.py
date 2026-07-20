# 📂 FILE: backend/tests/test_notification_repository.py
import pytest
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.models.employee import Employee
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.core.security import get_password_hash
from app.core.constants import ROLE_EMPLOYEE
from app.repositories.notification_repository import notification_repo
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams


@pytest.fixture
def repo_employee(db):
    """Fixture to insert a test employee for repository testing."""
    emp = Employee(
        employee_code="EMP_REPO_001",
        full_name="Repository Tester",
        email="repotest@example.com",
        password_hash=get_password_hash("repopass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def test_create_and_get_notification(db, repo_employee):
    # 1. Test creation
    notif = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="TASKS",
        title="Repo Test",
        message="Message content here",
        priority="HIGH",
        status="PENDING",
        channel="IN_APP",
        event_id="evt-123",
        context_json='{"task_id": 99}',
    )

    assert notif.id is not None
    assert notif.title == "Repo Test"
    assert notif.priority == "HIGH"

    # 2. Test get by id
    fetched = notification_repo.get_by_id(db, notif.id)
    assert fetched is not None
    assert fetched.message == "Message content here"
    assert fetched.employee_id == repo_employee.id


def test_idempotency_lookup(db, repo_employee):
    # Create notification with specific event_id and channel
    notif = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="SYSTEM",
        title="Unique Alert",
        message="Warning text",
        channel="EMAIL",
        event_id="unique-event-xyz",
    )

    # Lookup by event_id and channel
    found = notification_repo.get_by_event_id(db, "unique-event-xyz", "EMAIL")
    assert found is not None
    assert found.id == notif.id

    # Lookup for non-matching channel
    not_found = notification_repo.get_by_event_id(db, "unique-event-xyz", "IN_APP")
    assert not_found is None


def test_unread_count_and_marking_read(db, repo_employee):
    # Ensure starting clean
    assert notification_repo.get_unread_count(db, repo_employee.id) == 0

    # Create 2 unread IN_APP notifications
    n1 = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="SYSTEM",
        title="Alert 1",
        message="A",
        channel="IN_APP",
    )
    n2 = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="SYSTEM",
        title="Alert 2",
        message="B",
        channel="IN_APP",
    )
    # Create 1 unread EMAIL notification (which should NOT count towards unread in-app count)
    n3 = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="SYSTEM",
        title="Alert 3",
        message="C",
        channel="EMAIL",
    )

    # Unread in-app count should be exactly 2
    assert notification_repo.get_unread_count(db, repo_employee.id) == 2

    # Mark n1 as read
    notification_repo.mark_as_read(db, n1.id, repo_employee.id)
    assert notification_repo.get_unread_count(db, repo_employee.id) == 1

    # Mark all remaining in-app notifications as read
    marked_count = notification_repo.mark_all_as_read(db, repo_employee.id)
    assert marked_count == 1  # only n2 is marked read
    assert notification_repo.get_unread_count(db, repo_employee.id) == 0


def test_preferences_crud(db, repo_employee):
    # 1. Fetch empty preferences list
    prefs = notification_repo.get_user_preferences(db, repo_employee.id)
    assert len(prefs) == 0

    # 2. Update preference (insert)
    p = notification_repo.update_user_preference(
        db=db,
        employee_id=repo_employee.id,
        notification_type="TASKS",
        channel="EMAIL",
        enabled=True,
    )
    assert p.enabled is True

    # 3. Retrieve specific preference
    pref = notification_repo.get_user_preference(db, repo_employee.id, "TASKS", "EMAIL")
    assert pref is not None
    assert pref.enabled is True

    # 4. Update preference (modify)
    notification_repo.update_user_preference(
        db=db,
        employee_id=repo_employee.id,
        notification_type="TASKS",
        channel="EMAIL",
        enabled=False,
    )
    pref_updated = notification_repo.get_user_preference(
        db, repo_employee.id, "TASKS", "EMAIL"
    )
    assert pref_updated.enabled is False

    # 5. Delete preference
    deleted = notification_repo.delete_user_preference(
        db, repo_employee.id, "TASKS", "EMAIL"
    )
    assert deleted is True
    assert (
        notification_repo.get_user_preference(db, repo_employee.id, "TASKS", "EMAIL")
        is None
    )


def test_notification_logs_crud(db, repo_employee):
    # Create parent notification
    notif = notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="SYSTEM",
        title="Test Logs",
        message="X",
    )

    # Add logs
    l1 = notification_repo.log_delivery_attempt(
        db=db,
        notification_id=notif.id,
        channel="EMAIL",
        status="FAILED",
        retry_count=0,
        provider_response="Timeout connecting to SMTP",
    )
    l2 = notification_repo.log_delivery_attempt(
        db=db,
        notification_id=notif.id,
        channel="EMAIL",
        status="SENT",
        retry_count=1,
        provider_response="Delivered OK",
        duration_ms=120,
    )

    # Retrieve logs
    logs = notification_repo.get_notification_logs(db, notif.id)
    assert len(logs) == 2
    # Ordered by created_at desc (l2 is newer than l1)
    assert logs[0].id == l2.id
    assert logs[0].delivery_status == "SENT"
    assert logs[0].duration_ms == 120

    # Fetch specific log by id
    fetched_log = notification_repo.get_log_by_id(db, l1.id)
    assert fetched_log is not None
    assert fetched_log.provider_response == "Timeout connecting to SMTP"


def test_paginated_inbox_search(db, repo_employee):
    # Seed 3 notifications
    notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="TASKS",
        title="Design Schema",
        message="Message 1",
    )
    notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="TASKS",
        title="Review Code",
        message="Message 2",
    )
    notification_repo.create_notification(
        db=db,
        employee_id=repo_employee.id,
        type="VACATION",
        title="Submit Request",
        message="Message 3",
    )

    pagination = PaginationParams(page=1, size=2)
    filters = BaseFilterParams(keyword="Design")
    sort = SortParams(sort_by="title", sort_order="asc")

    # Run paginated query
    items, total = notification_repo.get_user_notifications(
        db=db,
        employee_id=repo_employee.id,
        pagination_params=pagination,
        filter_params=filters,
        sort_params=sort,
    )

    # Check bounds
    assert total == 1
    assert len(items) == 1
    assert items[0].title == "Design Schema"


def test_edge_case_invalid_employee_rollback(db):
    from sqlalchemy import text

    # Enable foreign keys locally for SQLite in this test connection
    is_sqlite = db.bind.dialect.name == "sqlite"
    if is_sqlite:
        db.execute(text("PRAGMA foreign_keys=ON"))

    try:
        # Attempt to insert a notification with an invalid foreign key employee_id
        invalid_employee_id = 999999

        with pytest.raises(IntegrityError):
            notification_repo.create_notification(
                db=db,
                employee_id=invalid_employee_id,
                type="SYSTEM",
                title="Invalid FK Test",
                message="This should raise FK error",
            )

        # Verify rollback successfully preserved session state
        db.rollback()
    finally:
        # Restore foreign keys setting for pooled connections
        if is_sqlite:
            db.execute(text("PRAGMA foreign_keys=OFF"))

    # Check that query runs fine post-rollback
    count = db.scalar(select(func.count(Notification.id)))
    assert isinstance(count, int)

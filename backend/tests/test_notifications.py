# 📂 FILE: backend/tests/test_notifications.py
import pytest
from app.models.employee import Employee
from app.models.notification import Notification
from app.core.security import get_password_hash
from app.core.constants import ROLE_EMPLOYEE
from app.schemas.notification import CreateNotificationRequest
from app.services.notification_service import notification_service
from fastapi import BackgroundTasks

@pytest.mark.anyio
async def test_notification_operations(client, db):
    # 1. SETUP: Create test employee and login
    emp_email = "notify_worker@example.com"
    emp_user = Employee(
        employee_code="EMP_NOTIFY_001",
        full_name="Notify Worker",
        email=emp_email,
        password_hash=get_password_hash("notifypass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    db.add(emp_user)
    db.commit()
    db.refresh(emp_user)

    response = client.post(
        "/api/v1/auth/login",
        data={"username": emp_email, "password": "notifypass"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. TEST: Synchronous Notification Creation
    req_data = CreateNotificationRequest(
        employee_id=emp_user.id,
        title="Sync Notification",
        message="This notification is synchronous."
    )
    notif = notification_service.create_notification(db, req_data)
    assert notif.id is not None
    assert notif.title == "Sync Notification"
    assert notif.is_read is False

    # 3. TEST: Asynchronous Notification Creation
    bg_tasks = BackgroundTasks()
    from app.services.background_job_service import BackgroundJobService
    bg_service = BackgroundJobService(bg_tasks)
    
    async_req = CreateNotificationRequest(
        employee_id=emp_user.id,
        title="Background Job",
        message="This notification is processed in the background."
    )
    notification_service.create_notification_async(bg_service, async_req)
    assert len(bg_tasks.tasks) == 1
    
    # Run the background tasks to persist it
    from unittest.mock import patch
    from tests.conftest import TestingSessionLocal
    with patch("app.database.SessionLocal", TestingSessionLocal):
        await bg_tasks()
    
    # Fetch from DB to verify it exists
    from sqlalchemy import select
    async_notif = db.scalars(
        select(Notification).where(Notification.title == "Background Job")
    ).first()
    assert async_notif is not None
    assert async_notif.message == "This notification is processed in the background."

    # 4. TEST: GET /notifications API (list, filter, pagination, sort)
    res_list = client.get("/api/v1/notifications?keyword=Sync", headers=headers)
    assert res_list.status_code == 200
    paged_data = res_list.json()
    assert paged_data["success"] is True
    assert len(paged_data["data"]) == 1
    assert paged_data["data"][0]["title"] == "Sync Notification"

    # 5. TEST: GET /notifications/unread-count API
    res_unread = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res_unread.status_code == 200
    assert res_unread.json()["data"]["unread_count"] == 2

    # 6. TEST: PATCH /notifications/{id}/read API
    res_read = client.patch(f"/api/v1/notifications/{notif.id}/read", headers=headers)
    assert res_read.status_code == 200
    assert res_read.json()["data"]["is_read"] is True

    # 7. TEST: PATCH /notifications/read-all API
    res_read_all = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert res_read_all.status_code == 200
    assert res_read_all.json()["data"]["marked_read_count"] == 1  # The remaining 1 unread notification (async one)
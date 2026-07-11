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


@pytest.mark.anyio
async def test_notification_api_extended(client, db):
    from app.core.constants import ROLE_ADMIN
    from app.repositories.notification_repository import notification_repo
    # 1. Setup: Create Emp1, Emp2, Admin
    emp1 = Employee(
        employee_code="EMP_API_EXT_001",
        full_name="User One",
        email="user1@example.com",
        password_hash=get_password_hash("pass1"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    emp2 = Employee(
        employee_code="EMP_API_EXT_002",
        full_name="User Two",
        email="user2@example.com",
        password_hash=get_password_hash("pass2"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    admin = Employee(
        employee_code="EMP_API_EXT_003",
        full_name="Admin User",
        email="adminnotif@example.com",
        password_hash=get_password_hash("adminpass"),
        role_id=ROLE_ADMIN,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    db.add(emp1)
    db.add(emp2)
    db.add(admin)
    db.commit()
    db.refresh(emp1)
    db.refresh(emp2)
    db.refresh(admin)

    # Login and get tokens/headers
    def login_and_headers(email, password):
        response = client.post("/api/v1/auth/login", data={"username": email, "password": password})
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    headers1 = login_and_headers("user1@example.com", "pass1")
    headers2 = login_and_headers("user2@example.com", "pass2")
    headers_admin = login_and_headers("adminnotif@example.com", "adminpass")

    # Create a notification belonging to Emp1
    notif1 = notification_repo.create_notification(
        db=db,
        employee_id=emp1.id,
        type="TASKS",
        title="Task 1 for Emp1",
        message="Description",
        priority="HIGH"
    )

    # 2. Test IDOR validation: Emp2 attempts to read Emp1's notification -> 403 Forbidden
    res_get_other = client.get(f"/api/v1/notifications/{notif1.id}", headers=headers2)
    assert res_get_other.status_code == 403

    # 3. Test IDOR validation: Emp2 attempts to mark Emp1's notification as read -> 403 Forbidden
    res_patch_other = client.patch(f"/api/v1/notifications/{notif1.id}/read", headers=headers2)
    assert res_patch_other.status_code == 403

    # 4. Test IDOR validation: Emp2 attempts to delete Emp1's notification -> 403 Forbidden
    res_delete_other = client.delete(f"/api/v1/notifications/{notif1.id}", headers=headers2)
    assert res_delete_other.status_code == 403

    # 5. Test Admin Override: Admin reads Emp1's notification -> 200 OK
    res_admin_get = client.get(f"/api/v1/notifications/{notif1.id}", headers=headers_admin)
    assert res_admin_get.status_code == 200
    assert res_admin_get.json()["data"]["title"] == "Task 1 for Emp1"

    # 6. Test Preferences API: GET and PUT
    res_pref_get = client.get("/api/v1/notification-preferences", headers=headers1)
    assert res_pref_get.status_code == 200
    assert len(res_pref_get.json()["data"]) == 0  # no preferences seeded yet

    res_pref_put = client.put(
        "/api/v1/notification-preferences",
        json={"notification_type": "TASKS", "channel": "EMAIL", "enabled": True},
        headers=headers1
    )
    assert res_pref_put.status_code == 200
    assert res_pref_put.json()["data"]["enabled"] is True

    # Verify preference exists
    res_pref_get2 = client.get("/api/v1/notification-preferences", headers=headers1)
    assert len(res_pref_get2.json()["data"]) == 1
    assert res_pref_get2.json()["data"][0]["notification_type"] == "TASKS"

    # 7. Test Filtering on List: priority and type filter
    res_list_filter = client.get("/api/v1/notifications?priority=HIGH&type=TASKS", headers=headers1)
    assert res_list_filter.status_code == 200
    assert len(res_list_filter.json()["data"]) == 1
    assert res_list_filter.json()["data"][0]["priority"] == "HIGH"

    res_list_empty = client.get("/api/v1/notifications?priority=LOW", headers=headers1)
    assert len(res_list_empty.json()["data"]) == 0

    # 8. Test Admin Delete Override: Admin deletes Emp1's notification -> 200 OK
    res_admin_delete = client.delete(f"/api/v1/notifications/{notif1.id}", headers=headers_admin)
    assert res_admin_delete.status_code == 200

    # Verify it is deleted
    res_get_deleted = client.get(f"/api/v1/notifications/{notif1.id}", headers=headers1)
    assert res_get_deleted.status_code == 404
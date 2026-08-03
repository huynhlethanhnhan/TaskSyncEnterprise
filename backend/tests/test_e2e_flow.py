import pytest
from app.models.employee import Employee
from app.models.project import Project
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.task_attachment import TaskAttachment
from app.core.security import get_password_hash
from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE


def test_complete_e2e_flow(client, db):
    print("\n--- E2E FLOW START ---")

    # 1. SETUP: Create Admin and Employee users
    admin_email = "admin_e2e@example.com"
    emp_email = "worker_e2e@example.com"

    admin_user = Employee(
        employee_code="EMP_ADM_E2E",
        full_name="E2E Admin",
        email=admin_email,
        password_hash=get_password_hash("adminpass"),
        role_id=ROLE_ADMIN,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    emp_user = Employee(
        employee_code="EMP_WRK_E2E",
        full_name="E2E Worker",
        email=emp_email,
        password_hash=get_password_hash("workerpass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(admin_user)
    db.add(emp_user)
    db.commit()

    # Create test project
    project = Project(
        name="E2E Test Project",
        project_code="PRJ_E2E",
        status="Planning",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()

    # 2. LOGIN: Admin signs in to obtain access token
    response = client.post(
        "/api/v1/auth/login", data={"username": admin_email, "password": "adminpass"}
    )
    assert response.status_code == 200
    admin_token = response.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Authentication Token acquired successfully.")

    # 3. TASK CREATION: Admin creates a new task
    task_res = client.post(
        "/api/v1/tasks",
        json={
            "project_id": project.id,
            "title": "E2E Integration Task",
            "description": "Verify complete system flow",
            "priority": "High",
            "status": "To Do",
            "story_points": 3,
        },
        headers=admin_headers,
    )
    assert task_res.status_code == 201, task_res.json()
    task_id = task_res.json()["id"]
    print(f"[PASS] Task created successfully. Task ID: {task_id}")

    # 4. ASSIGN TASK: Admin assigns the task to the employee
    assignment = TaskAssignment(task_id=task_id, employee_id=emp_user.id)
    db.add(assignment)
    db.commit()
    print(f"[PASS] Task assigned to Employee ID: {emp_user.id}")

    # 5. ATTACH FILE: Employee logs in and uploads an attachment
    emp_login_res = client.post(
        "/api/v1/auth/login", data={"username": emp_email, "password": "workerpass"}
    )
    assert emp_login_res.status_code == 200
    emp_token = emp_login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Mock file upload
    import io

    file_content = b"E2E Verification File Content"
    file_tuple = ("test_doc.txt", io.BytesIO(file_content), "text/plain")

    upload_res = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        files={"file": file_tuple},
        headers=emp_headers,
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["success"] is True
    print("[PASS] File attachment uploaded successfully.")

    # 6. VERIFY DB: Assert that records exist in database
    db_attachments = db.query(TaskAttachment).filter_by(task_id=task_id).all()
    assert len(db_attachments) == 1
    assert db_attachments[0].file_name == "test_doc.txt"
    print("[PASS] Verified task attachment database record exists.")

    # 7. LOGOUT: Perform logout and assert access token is blacklisted
    logout_res = client.post("/api/v1/auth/logout", headers=emp_headers)
    assert logout_res.status_code == 200
    print("[PASS] User logged out successfully.")

    # Verify token is now blacklisted
    follow_up_res = client.get("/api/v1/tasks/my-tasks", headers=emp_headers)
    assert follow_up_res.status_code == 401
    print("[PASS] Blacklisted access token rejected on follow-up request.")
    print("--- E2E FLOW END ---")

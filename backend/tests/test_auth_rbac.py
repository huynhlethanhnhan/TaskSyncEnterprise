import pytest
from app.models.employee import Employee
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.core.security import get_password_hash
from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.department import Department
from app.models.team import Team


def create_mock_user(db, email, role_id, password="password123", department_id=None):
    hashed = get_password_hash(password)
    user = Employee(
        employee_code=f"EMP_{email.split('@')[0]}",
        full_name="Mock User",
        email=email,
        password_hash=hashed,
        role_id=role_id,
        department_id=department_id,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_headers(client, email, password="password123"):
    response = client.post(
        "/api/v1/auth/login", data={"username": email, "password": password}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 🧪 TEST CASE 1: Authentication & Token Generation
def test_login_success(client, db):
    email = "admin@example.com"
    create_mock_user(db, email, ROLE_ADMIN)

    response = client.post(
        "/api/v1/auth/login", data={"username": email, "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == email


# 🧪 TEST CASE 2: RBAC - Admin access permitted
def test_admin_access_allowed(client, db):
    email = "admin@example.com"
    create_mock_user(db, email, ROLE_ADMIN)
    headers = get_auth_headers(client, email)

    response = client.get("/api/v1/employees", headers=headers)
    assert response.status_code == 200


# 🧪 TEST CASE 3: RBAC - Regular Employee access rejected (403 Forbidden)
def test_employee_access_denied(client, db):
    email = "employee@example.com"
    create_mock_user(db, email, ROLE_EMPLOYEE)
    headers = get_auth_headers(client, email)

    # Standard employee should be blocked from retrieving full list of employees
    response = client.get("/api/v1/employees", headers=headers)
    assert response.status_code == 403


def test_manager_employee_list_is_scoped_to_own_department(client, db):
    own_department = Department(department_code="OWN", name="Own Department")
    foreign_department = Department(
        department_code="FOREIGN", name="Foreign Department"
    )
    db.add_all([own_department, foreign_department])
    db.commit()

    manager = create_mock_user(
        db,
        "manager@example.com",
        ROLE_MANAGER,
        department_id=own_department.id,
    )
    colleague = create_mock_user(
        db,
        "colleague@example.com",
        ROLE_EMPLOYEE,
        department_id=own_department.id,
    )
    outsider = create_mock_user(
        db,
        "outsider@example.com",
        ROLE_EMPLOYEE,
        department_id=foreign_department.id,
    )
    headers = get_auth_headers(client, manager.email)

    response = client.get("/api/v1/employees?limit=100", headers=headers)

    assert response.status_code == 200
    employee_ids = {employee["id"] for employee in response.json()}
    assert manager.id in employee_ids
    assert colleague.id in employee_ids
    assert outsider.id not in employee_ids


def test_login_identifies_delegated_team_leader(client, db):
    department = Department(department_code="LEAD", name="Leadership Department")
    db.add(department)
    db.commit()
    leader = create_mock_user(
        db,
        "leader@example.com",
        ROLE_EMPLOYEE,
        department_id=department.id,
    )
    team = Team(
        department_id=department.id,
        team_code="LEAD-T1",
        name="Leadership Team",
        leader_id=leader.id,
        is_active=True,
    )
    db.add(team)
    db.commit()
    leader.team_id = team.id
    db.commit()

    response = client.post(
        "/api/v1/auth/login",
        data={"username": leader.email, "password": "password123"},
    )

    assert response.status_code == 200
    user = response.json()["user"]
    assert user["role"] == "employee"
    assert user["team_id"] == team.id
    assert user["is_team_leader"] is True


# 🧪 TEST CASE 4: Assigned employees can update status and progress
def test_assigned_employee_can_update_status_and_progress(client, db):
    email = "worker@example.com"
    user = create_mock_user(db, email, ROLE_EMPLOYEE)
    headers = get_auth_headers(client, email)

    # Create project and task
    from app.models.project import Project

    project = Project(
        name="Test Project",
        project_code="PRJ001",
        status="Planning",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()

    task = Task(
        project_id=project.id,
        title="Assigned Task",
        status="To Do",
        priority="Medium",
        story_points=1,
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(task)
    db.commit()

    # Assign task to user
    assignment = TaskAssignment(task_id=task.id, employee_id=user.id)
    db.add(assignment)
    db.commit()

    # Assigned employees can update status and progress on their own tasks.
    response = client.put(
        f"/api/v1/tasks/my-task/{task.id}",
        json={"status": "In Progress", "progress_percent": 50.0},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "In Progress"
    assert response.json()["progress_percent"] == 50.0

    db.refresh(task)
    assert task.status == "In Progress"
    assert task.progress_percent == 50.0


def test_assigned_employee_cannot_update_admin_fields(client, db):
    email = "worker@example.com"
    user = create_mock_user(db, email, ROLE_EMPLOYEE)
    headers = get_auth_headers(client, email)

    from app.models.project import Project

    project = Project(
        name="Test Project",
        project_code="PRJ001",
        status="Planning",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()

    task = Task(
        project_id=project.id,
        title="Assigned Task",
        status="To Do",
        priority="Medium",
        story_points=1,
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(task)
    db.commit()
    db.add(TaskAssignment(task_id=task.id, employee_id=user.id))
    db.commit()

    response = client.put(
        f"/api/v1/tasks/{task.id}",
        json={
            "title": "Unauthorized title change",
            "story_points": 8,
            "deadline": "2026-08-15",
        },
        headers=headers,
    )
    assert response.status_code == 403


# 🧪 TEST CASE 5: Task Ownership Failure - Modify unauthorized task (Negative Test)
def test_unassigned_employee_cannot_update_task_status(client, db):
    email_1 = "worker1@example.com"
    email_2 = "worker2@example.com"
    user_1 = create_mock_user(db, email_1, ROLE_EMPLOYEE)
    user_2 = create_mock_user(db, email_2, ROLE_EMPLOYEE)
    headers_1 = get_auth_headers(client, email_1)

    # Create project and task
    from app.models.project import Project

    project = Project(
        name="Test Project",
        project_code="PRJ001",
        status="Planning",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()

    task = Task(
        project_id=project.id,
        title="Worker 2 Task",
        status="To Do",
        priority="Medium",
        story_points=1,
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(task)
    db.commit()

    # Assign task to user 2 (NOT user 1)
    assignment = TaskAssignment(task_id=task.id, employee_id=user_2.id)
    db.add(assignment)
    db.commit()

    # User 1 attempts to update User 2's task status
    response = client.put(
        f"/api/v1/tasks/my-task/{task.id}",
        json={"status": "Done", "progress_percent": 100.0},
        headers=headers_1,
    )
    # Must fail with 403 Forbidden
    assert response.status_code == 403


def test_manager_can_update_same_department_employee_contact_fields_only(client, db):
    own_dept = Department(department_code="MGR-OWN", name="Own Dept")
    other_dept = Department(department_code="MGR-OTH", name="Other Dept")
    db.add_all([own_dept, other_dept])
    db.commit()

    manager = create_mock_user(
        db, "mgr_contact@example.com", ROLE_MANAGER, department_id=own_dept.id
    )
    colleague = create_mock_user(
        db, "colleague_contact@example.com", ROLE_EMPLOYEE, department_id=own_dept.id
    )
    outsider = create_mock_user(
        db, "outsider_contact@example.com", ROLE_EMPLOYEE, department_id=other_dept.id
    )
    headers = get_auth_headers(client, manager.email)

    res = client.put(
        f"/api/v1/employees/{colleague.id}",
        json={
            "phone": "0909123456",
            "gender": "Female",
            "address": "123 Nguyen Hue, Q1",
            "role_id": ROLE_ADMIN,
        },
        headers=headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["phone"] == "0909123456"
    assert body["gender"] == "Female"
    assert body["address"] == "123 Nguyen Hue, Q1"
    assert body["role_id"] == ROLE_EMPLOYEE

    forbidden_res = client.put(
        f"/api/v1/employees/{outsider.id}",
        json={"phone": "0900000000"},
        headers=headers,
    )
    assert forbidden_res.status_code == 403


def test_task_rename_in_completed_sprint_succeeds_without_409_or_422(client, db):
    from app.models.project import Project
    from app.models.sprint import Sprint

    admin = create_mock_user(db, "sprint_rename_admin@example.com", ROLE_ADMIN)
    headers = get_auth_headers(client, admin.email)

    project = Project(
        name="Sprint Rename Project",
        project_code="PRJ-SRN",
        status="Active",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()

    sprint = Sprint(
        project_id=project.id,
        name="Completed Sprint",
        status="Completed",
        capacity=20,
        is_deleted=False,
    )
    db.add(sprint)
    db.commit()

    task = Task(
        project_id=project.id,
        sprint_id=sprint.id,
        title="Legacy Name",
        status="Review",
        priority="Medium",
        story_points=4,
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(task)
    db.commit()

    rename_res = client.put(
        f"/api/v1/tasks/{task.id}",
        json={"title": "Updated Task Name"},
        headers=headers,
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["title"] == "Updated Task Name"


def test_employee_list_and_profile_report_live_online_presence(client, db):
    from datetime import datetime, timedelta, timezone
    from app.models.user_session import UserSession

    admin = create_mock_user(db, "presence_admin@example.com", ROLE_ADMIN)
    offline_emp = create_mock_user(db, "presence_offline@example.com", ROLE_EMPLOYEE)
    stale_emp = create_mock_user(db, "presence_stale@example.com", ROLE_EMPLOYEE)

    stale_session = UserSession(
        employee_id=stale_emp.id,
        access_token="stale-access-token-123456",
        refresh_token="stale-refresh-token-123456",
        is_active=True,
        created_at=datetime.now(timezone.utc) - timedelta(days=5),
    )
    db.add(stale_session)
    db.commit()

    headers = get_auth_headers(client, admin.email)

    me_res = client.get("/api/v1/employees/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["is_online"] is True

    list_res = client.get("/api/v1/employees?limit=100", headers=headers)
    assert list_res.status_code == 200
    rows = {row["id"]: row for row in list_res.json()}
    assert rows[admin.id]["is_online"] is True
    assert rows[offline_emp.id]["is_online"] is False
    assert rows[stale_emp.id]["is_online"] is False


def test_forgot_password_notifies_admin_and_admin_or_token_resets_password(client, db):
    admin = create_mock_user(db, "pwd_admin@example.com", ROLE_ADMIN)
    employee = create_mock_user(db, "pwd_worker@example.com", ROLE_EMPLOYEE)
    admin_headers = get_auth_headers(client, admin.email)
    emp_headers = get_auth_headers(client, employee.email)

    # 1. Employee submits public forgot-password request
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": employee.email, "note": "Quen mat khau may moi"},
    )
    assert forgot_res.status_code == 200
    assert forgot_res.json()["admin_notified"] is True

    # 2. Non-admin cannot view admin pending reset queue
    forbidden_q = client.get(
        "/api/v1/employees/password-reset-requests", headers=emp_headers
    )
    assert forbidden_q.status_code == 403

    # 3. Admin sees both the real-time Notification and the Pending Queue entry
    queue_res = client.get(
        "/api/v1/employees/password-reset-requests", headers=admin_headers
    )
    assert queue_res.status_code == 200
    pending = queue_res.json()
    assert len(pending) == 1
    assert pending[0]["employee_id"] == employee.id
    assert pending[0]["note"] == "Quen mat khau may moi"

    notif_res = client.get("/api/v1/notifications", headers=admin_headers)
    assert notif_res.status_code == 200
    notif_body = notif_res.json()
    notif_items = (
        notif_body if isinstance(notif_body, list) else notif_body.get("data", [])
    )
    assert any(n["type"] == "PASSWORD_RESET_REQUEST" for n in notif_items)

    # 4. Admin resets employee password (auto temp password + single-use reset link)
    reset_res = client.post(
        f"/api/v1/employees/{employee.id}/reset-password",
        json={"force_change_on_login": True, "notify_via_email": False},
        headers=admin_headers,
    )
    assert reset_res.status_code == 200
    body = reset_res.json()
    temp_password = body["temporary_password"]
    reset_token = body["reset_link"].split("token=")[1]

    # Queue is automatically cleared once handled
    after_queue = client.get(
        "/api/v1/employees/password-reset-requests", headers=admin_headers
    )
    assert after_queue.status_code == 200
    assert after_queue.json() == []

    # Employee can log in with the temporary password
    login_temp = client.post(
        "/api/v1/auth/login",
        data={"username": employee.email, "password": temp_password},
    )
    assert login_temp.status_code == 200
    assert login_temp.json()["is_first_login"] is True

    # 5. Employee uses the signed single-use reset link to set a personal password
    new_pwd = "MyNewPass@2026!"
    self_reset = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": new_pwd,
            "confirm_password": new_pwd,
        },
    )
    assert self_reset.status_code == 200

    # Reusing the same reset token fails immediately (single-use fingerprint)
    reuse_res = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "AnotherPass@2026!",
            "confirm_password": "AnotherPass@2026!",
        },
    )
    assert reuse_res.status_code == 400

    # Login succeeds with the final password
    login_final = client.post(
        "/api/v1/auth/login",
        data={"username": employee.email, "password": new_pwd},
    )
    assert login_final.status_code == 200

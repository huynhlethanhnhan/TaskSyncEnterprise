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

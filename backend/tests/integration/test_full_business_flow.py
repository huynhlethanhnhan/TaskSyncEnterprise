# 📂 FILE: backend/tests/integration/test_full_business_flow.py
import pytest
from app.core.security import create_access_token, get_password_hash
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
from app.models.employee import Employee
from app.seeds.seed_roles import seed_roles


def get_auth_header(email: str, user_id: int, role_id: int):
    token = create_access_token(
        {"sub": str(user_id), "email": email, "role_id": role_id}
    )
    return {"Authorization": f"Bearer {token}"}


def test_full_business_flow_sequence(client, db):
    # Step 1: Initialize Admin in test db
    seed_roles(db)
    admin = Employee(
        employee_code="EMP-ADMIN001",
        full_name="System Admin",
        email="admin@tasksync.com",
        password_hash=get_password_hash("TaskSync@2026"),
        role_id=ROLE_ADMIN,
        is_active=True,
        is_deleted=False,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    admin_headers = get_auth_header(admin.email, admin.id, ROLE_ADMIN)

    # Step 2: Create Department
    dept_resp = client.post(
        "/api/v1/departments",
        json={
            "department_code": "ENG",
            "name": "Engineering",
            "description": "Software Engineering",
        },
        headers=admin_headers,
    )
    assert dept_resp.status_code in (200, 201), dept_resp.text
    dept_data = dept_resp.json()
    dept_id = dept_data["id"]

    # Step 3: Create Team belonging to Department
    team_resp = client.post(
        "/api/v1/teams",
        json={
            "team_code": "PLATFORM",
            "name": "Platform Team",
            "department_id": dept_id,
            "description": "Core Platform",
        },
        headers=admin_headers,
    )
    assert team_resp.status_code in (200, 201), team_resp.text
    team_id = team_resp.json()["id"]

    # Step 4: Create Manager
    mgr_resp = client.post(
        "/api/v1/employees",
        json={
            "employee_code": "EMP-MGR01",
            "full_name": "Project Manager",
            "email": "manager@tasksync.com",
            "password": "Password123!",
            "role_id": ROLE_MANAGER,
            "department_id": dept_id,
            "team_id": team_id,
            "job_title": "Engineering Manager",
        },
        headers=admin_headers,
    )
    assert mgr_resp.status_code in (200, 201), mgr_resp.text
    mgr_id = mgr_resp.json()["id"]

    # Step 5: Create Employee 1 & Employee 2
    dev1_resp = client.post(
        "/api/v1/employees",
        json={
            "employee_code": "EMP-DEV01",
            "full_name": "Backend Developer",
            "email": "developer1@tasksync.com",
            "password": "Password123!",
            "role_id": ROLE_EMPLOYEE,
            "department_id": dept_id,
            "team_id": team_id,
            "job_title": "Senior Backend Engineer",
        },
        headers=admin_headers,
    )
    assert dev1_resp.status_code in (200, 201), dev1_resp.text
    dev1_id = dev1_resp.json()["id"]

    dev2_resp = client.post(
        "/api/v1/employees",
        json={
            "employee_code": "EMP-DEV02",
            "full_name": "Frontend Developer",
            "email": "developer2@tasksync.com",
            "password": "Password123!",
            "role_id": ROLE_EMPLOYEE,
            "department_id": dept_id,
            "team_id": team_id,
            "job_title": "Frontend Engineer",
        },
        headers=admin_headers,
    )
    assert dev2_resp.status_code in (200, 201), dev2_resp.text
    dev2_id = dev2_resp.json()["id"]

    # Step 6: Create Project (Admin or Manager)
    project_resp = client.post(
        "/api/v1/projects",
        json={
            "project_code": "PRJ-CORE",
            "name": "TaskSync Core Platform",
            "description": "Core Infrastructure",
            "department_id": dept_id,
            "team_id": team_id,
            "status": "Active",
        },
        headers=admin_headers,
    )
    assert project_resp.status_code in (200, 201), project_resp.text
    prj_data = project_resp.json()
    prj_id = prj_data["id"]
    assert prj_data["department_id"] == dept_id
    assert prj_data["team_id"] == team_id

    # Step 7: Add Members to Project
    for emp_id in (mgr_id, dev1_id, dev2_id):
        m_resp = client.post(
            f"/api/v1/projects/{prj_id}/members",
            json={"employee_id": emp_id},
            headers=admin_headers,
        )
        assert m_resp.status_code in (200, 201), m_resp.text

    # Step 8: Create Sprint 1
    sprint_resp = client.post(
        "/api/v1/sprints",
        json={
            "name": "Sprint 1",
            "project_id": prj_id,
            "goal": "Build foundation",
            "status": "Planned",
        },
        headers=admin_headers,
    )
    assert sprint_resp.status_code in (200, 201), sprint_resp.text
    sprint1_id = sprint_resp.json()["id"]

    # Step 9: Create Task 1 (Sprint 1, Assignee Dev 1)
    task1_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Backend Setup Task",
            "project_id": prj_id,
            "sprint_id": sprint1_id,
            "assigned_to": dev1_id,
            "priority": "High",
            "status": "To Do",
        },
        headers=admin_headers,
    )
    assert task1_resp.status_code in (200, 201), task1_resp.text

    # Step 10: Create Task 2 (Sprint 1, Assignee Dev 2)
    task2_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Frontend Setup Task",
            "project_id": prj_id,
            "sprint_id": sprint1_id,
            "assigned_to": dev2_id,
            "priority": "Medium",
            "status": "To Do",
        },
        headers=admin_headers,
    )
    assert task2_resp.status_code in (200, 201), task2_resp.text

    # Step 11: Create Task 3 without Sprint (Project Backlog)
    task3_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Backlog Feature Task",
            "project_id": prj_id,
            "sprint_id": None,
            "assigned_to": dev1_id,
            "priority": "Low",
            "status": "To Do",
        },
        headers=admin_headers,
    )
    assert task3_resp.status_code in (200, 201), task3_resp.text
    assert task3_resp.json()["sprint_id"] is None

    # Step 12: Manager operations
    mgr_headers = get_auth_header("manager@tasksync.com", mgr_id, ROLE_MANAGER)
    sprint2_resp = client.post(
        "/api/v1/sprints",
        json={"name": "Sprint 2", "project_id": prj_id, "status": "Planned"},
        headers=mgr_headers,
    )
    assert sprint2_resp.status_code in (200, 201), sprint2_resp.text

    # Step 13: Negative Cases Validation
    # 13a. Duplicate member addition -> 409
    dup_m_resp = client.post(
        f"/api/v1/projects/{prj_id}/members",
        json={"employee_id": dev1_id},
        headers=admin_headers,
    )
    assert dup_m_resp.status_code == 409

    # 13b. Invalid assignee not in project -> 409 (ASSIGNEE_NOT_PROJECT_MEMBER)
    other_emp_resp = client.post(
        "/api/v1/employees",
        json={
            "employee_code": "EMP-OTHER",
            "full_name": "Outsider Dev",
            "email": "outsider@tasksync.com",
            "password": "Password123!",
            "role_id": ROLE_EMPLOYEE,
            "job_title": "Consultant",
        },
        headers=admin_headers,
    )
    outsider_id = other_emp_resp.json()["id"]

    invalid_assign_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Invalid Task Assignment",
            "project_id": prj_id,
            "assigned_to": outsider_id,
        },
        headers=admin_headers,
    )
    assert invalid_assign_resp.status_code == 409
    assert invalid_assign_resp.json().get("error_code") == "ASSIGNEE_NOT_PROJECT_MEMBER"

    # 13c. Invalid Sprint mismatch -> 409 (SPRINT_MISMATCH)
    prj2_resp = client.post(
        "/api/v1/projects",
        json={"project_code": "PRJ-OTHER", "name": "Other Project", "status": "Active"},
        headers=admin_headers,
    )
    prj2_id = prj2_resp.json()["id"]

    sprint_mismatch_resp = client.post(
        "/api/v1/tasks",
        json={
            "title": "Mismatch Sprint Task",
            "project_id": prj2_id,
            "sprint_id": sprint1_id,
        },
        headers=admin_headers,
    )
    assert sprint_mismatch_resp.status_code == 409
    assert sprint_mismatch_resp.json().get("error_code") == "SPRINT_MISMATCH"

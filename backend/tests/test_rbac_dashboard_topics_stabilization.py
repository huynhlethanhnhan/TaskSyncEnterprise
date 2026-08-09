"""
Integration and RBAC unit tests for Final Stabilization Fixes:
1. Dashboard scoping per role (Admin, Manager, Employee)
2. Topic creation project validation (400 if missing project_id, 403 if invalid department)
3. Employee list endpoints restrictions (403 for /employees, /departments, /teams)
"""

import uuid
import pytest
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
from app.core.security import create_access_token, get_password_hash


def _create_employee(db, email, role_id, dept_id, name):
    emp = Employee(
        employee_code=f"EMP_{uuid.uuid4().hex[:6]}",
        email=email,
        full_name=name,
        role_id=role_id,
        department_id=dept_id,
        password_hash=get_password_hash("TaskSync@2026"),
        is_active=True,
        is_deleted=False,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def _auth_header(emp_id):
    token = create_access_token(data={"sub": str(emp_id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def rbac_fixture(db):
    uid = uuid.uuid4().hex[:6]

    # Departments
    dept_it = Department(
        name=f"IT Dept {uid}", department_code=f"IT-{uid}", is_active=True
    )
    dept_hr = Department(
        name=f"HR Dept {uid}", department_code=f"HR-{uid}", is_active=True
    )
    db.add_all([dept_it, dept_hr])
    db.commit()
    db.refresh(dept_it)
    db.refresh(dept_hr)

    # Users
    admin_usr = _create_employee(
        db, f"adm_{uid}@test.com", ROLE_ADMIN, dept_it.id, "Stab Admin"
    )
    mgr_it = _create_employee(
        db, f"mgrit_{uid}@test.com", ROLE_MANAGER, dept_it.id, "IT Manager"
    )
    emp_it = _create_employee(
        db, f"empit_{uid}@test.com", ROLE_EMPLOYEE, dept_it.id, "IT Employee"
    )
    emp_hr = _create_employee(
        db, f"emphr_{uid}@test.com", ROLE_EMPLOYEE, dept_hr.id, "HR Employee"
    )

    # Projects
    proj_it = Project(
        project_code=f"PIT-{uid}",
        name=f"IT Project {uid}",
        status="Active",
        department_id=dept_it.id,
        created_by=mgr_it.id,
        is_deleted=False,
    )
    proj_hr = Project(
        project_code=f"PHR-{uid}",
        name=f"HR Project {uid}",
        status="Active",
        department_id=dept_hr.id,
        created_by=admin_usr.id,
        is_deleted=False,
    )
    db.add_all([proj_it, proj_hr])
    db.commit()
    db.refresh(proj_it)
    db.refresh(proj_hr)

    # Memberships
    pm_it = ProjectMember(project_id=proj_it.id, employee_id=emp_it.id)
    db.add(pm_it)
    db.commit()

    # Tasks
    task_it = Task(
        title=f"IT Task {uid}",
        status="In Progress",
        project_id=proj_it.id,
        created_by=mgr_it.id,
        is_deleted=False,
    )
    db.add(task_it)
    db.commit()
    db.refresh(task_it)

    assign_it = TaskAssignment(task_id=task_it.id, employee_id=emp_it.id)
    db.add(assign_it)
    db.commit()

    return {
        "admin_id": admin_usr.id,
        "mgr_it_id": mgr_it.id,
        "emp_it_id": emp_it.id,
        "emp_hr_id": emp_hr.id,
        "dept_it_id": dept_it.id,
        "dept_hr_id": dept_hr.id,
        "proj_it_id": proj_it.id,
        "proj_hr_id": proj_hr.id,
        "task_it_id": task_it.id,
    }


# ── Test 1: Dashboard Scoping ──────────────────────────────────────────────────


def test_dashboard_overview_scoped_by_role(client, rbac_fixture):
    # Admin Dashboard Overview
    r_admin = client.get(
        "/api/v1/dashboard/overview", headers=_auth_header(rbac_fixture["admin_id"])
    )
    assert r_admin.status_code == 200
    res_admin = r_admin.json()["data"]
    assert res_admin["total_employees"] >= 4

    # Employee Dashboard Overview: system counts should be zeroed
    r_emp = client.get(
        "/api/v1/dashboard/overview", headers=_auth_header(rbac_fixture["emp_it_id"])
    )
    assert r_emp.status_code == 200
    res_emp = r_emp.json()["data"]
    assert res_emp["total_employees"] == 0
    assert res_emp["total_departments"] == 0
    assert res_emp["total_projects"] >= 1
    assert res_emp["total_tasks"] >= 1


# ── Test 2: Topic Creation Validation ──────────────────────────────────────────


def test_topic_creation_requires_project_id(client, rbac_fixture):
    # Creating topic without project_id should return 400 Bad Request
    payload = {
        "title": "Missing Project Topic",
        "content": "Test content",
        "project_id": None,
    }
    r = client.post(
        "/api/v1/topics", json=payload, headers=_auth_header(rbac_fixture["admin_id"])
    )
    assert r.status_code == 400
    res_json = r.json()
    msg = res_json.get("detail") or res_json.get("message") or str(res_json)
    assert "Target project is required" in msg


def test_topic_creation_forbidden_for_other_department_project(client, rbac_fixture):
    # IT Manager attempting to create topic in HR Project should return 403 Forbidden
    payload = {
        "title": "Cross Department Topic",
        "content": "Test content",
        "project_id": rbac_fixture["proj_hr_id"],
    }
    r = client.post(
        "/api/v1/topics", json=payload, headers=_auth_header(rbac_fixture["mgr_it_id"])
    )
    assert r.status_code == 403


def test_topic_creation_success_for_authorized_user(client, rbac_fixture):
    # IT Employee in IT Project creates topic -> 201 Created
    payload = {
        "title": "Valid Member Topic",
        "content": "Discussion details",
        "project_id": rbac_fixture["proj_it_id"],
    }
    r = client.post(
        "/api/v1/topics", json=payload, headers=_auth_header(rbac_fixture["emp_it_id"])
    )
    assert r.status_code == 201
    assert r.json()["project_id"] == rbac_fixture["proj_it_id"]


# ── Test 3: Employee Route Visibility Restrictions ─────────────────────────────


def test_employee_cannot_list_employees(client, rbac_fixture):
    r = client.get("/api/v1/employees", headers=_auth_header(rbac_fixture["emp_it_id"]))
    assert r.status_code == 403


def test_employee_cannot_list_departments(client, rbac_fixture):
    r = client.get(
        "/api/v1/departments", headers=_auth_header(rbac_fixture["emp_it_id"])
    )
    assert r.status_code == 403


def test_employee_cannot_list_teams(client, rbac_fixture):
    r = client.get("/api/v1/teams", headers=_auth_header(rbac_fixture["emp_it_id"]))
    assert r.status_code == 403

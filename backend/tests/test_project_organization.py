import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.department import Department
from app.models.team import Team
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.core.security import get_password_hash
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE

client = TestClient(app)


def get_auth_headers(client: TestClient, email: str, password: str = "password123"):
    resp = client.post(
        "/api/v1/auth/login", data={"username": email, "password": password}
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def org_setup(db: Session):
    # Department 1: Engineering
    dept_eng = Department(
        department_code="ENG-DEPT", name="Engineering", is_active=True
    )
    # Department 2: Marketing
    dept_mkt = Department(department_code="MKT-DEPT", name="Marketing", is_active=True)
    db.add_all([dept_eng, dept_mkt])
    db.commit()
    db.refresh(dept_eng)
    db.refresh(dept_mkt)

    # Team 1 under Engineering: Backend Team
    team_be = Team(
        team_code="ENG-BE",
        name="Backend Team",
        department_id=dept_eng.id,
        is_active=True,
    )
    # Team 2 under Marketing: Growth Team
    team_growth = Team(
        team_code="MKT-GRO",
        name="Growth Team",
        department_id=dept_mkt.id,
        is_active=True,
    )
    db.add_all([team_be, team_growth])
    db.commit()
    db.refresh(team_be)
    db.refresh(team_growth)

    # Admin User
    admin = Employee(
        employee_code="EMP-ADM01",
        full_name="System Admin",
        email="admin_org@tasksync.com",
        password_hash=get_password_hash("password123"),
        role_id=ROLE_ADMIN,
        is_active=True,
    )
    # Manager in Engineering
    mgr_eng = Employee(
        employee_code="EMP-MGR01",
        full_name="Eng Manager",
        email="mgr_eng@tasksync.com",
        password_hash=get_password_hash("password123"),
        role_id=ROLE_MANAGER,
        department_id=dept_eng.id,
        team_id=team_be.id,
        is_active=True,
    )
    # Developer in Backend Team
    dev_be = Employee(
        employee_code="EMP-DEV01",
        full_name="BE Developer",
        email="dev_be@tasksync.com",
        password_hash=get_password_hash("password123"),
        role_id=ROLE_EMPLOYEE,
        department_id=dept_eng.id,
        team_id=team_be.id,
        is_active=True,
    )
    # Marketing Specialist in Growth Team
    mkt_spec = Employee(
        employee_code="EMP-MKT01",
        full_name="Mkt Specialist",
        email="mkt_spec@tasksync.com",
        password_hash=get_password_hash("password123"),
        role_id=ROLE_EMPLOYEE,
        department_id=dept_mkt.id,
        team_id=team_growth.id,
        is_active=True,
    )
    db.add_all([admin, mgr_eng, dev_be, mkt_spec])
    db.commit()
    db.refresh(admin)
    db.refresh(mgr_eng)
    db.refresh(dev_be)
    db.refresh(mkt_spec)

    return {
        "dept_eng": dept_eng,
        "dept_mkt": dept_mkt,
        "team_be": team_be,
        "team_growth": team_growth,
        "admin": admin,
        "mgr_eng": mgr_eng,
        "dev_be": dev_be,
        "mkt_spec": mkt_spec,
    }


def test_01_create_project_with_valid_department_and_team(
    client: TestClient, org_setup: dict
):
    headers = get_auth_headers(client, org_setup["admin"].email)
    payload = {
        "project_code": "PRJ-TEST-01",
        "name": "Backend Platform Service",
        "description": "Core API Gateway development",
        "status": "Active",
        "department_id": org_setup["dept_eng"].id,
        "team_id": org_setup["team_be"].id,
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200, f"Failed to create project: {resp.text}"
    data = resp.json()
    assert data["project_code"] == "PRJ-TEST-01"
    assert data["department_id"] == org_setup["dept_eng"].id
    assert data["team_id"] == org_setup["team_be"].id
    assert data["department_name"] == "Engineering"
    assert data["team_name"] == "Backend Team"


def test_02_create_project_with_no_team(client: TestClient, org_setup: dict):
    headers = get_auth_headers(client, org_setup["admin"].email)
    payload = {
        "project_code": "PRJ-TEST-02",
        "name": "Cross-Team Eng Study",
        "status": "Planning",
        "department_id": org_setup["dept_eng"].id,
        "team_id": None,
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["department_id"] == org_setup["dept_eng"].id
    assert data["team_id"] is None
    assert data["department_name"] == "Engineering"
    assert data["team_name"] is None


def test_03_reject_mismatched_department_and_team(client: TestClient, org_setup: dict):
    headers = get_auth_headers(client, org_setup["admin"].email)
    payload = {
        "project_code": "PRJ-TEST-03",
        "name": "Invalid Org Pair Project",
        "status": "Planning",
        "department_id": org_setup["dept_eng"].id,
        "team_id": org_setup[
            "team_growth"
        ].id,  # Growth Team belongs to Marketing, not Engineering!
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 409, f"Expected 409, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["error_code"] == "TEAM_DEPARTMENT_MISMATCH"


def test_04_update_project_department_resets_or_validates_team(
    client: TestClient, org_setup: dict
):
    headers = get_auth_headers(client, org_setup["admin"].email)
    # Create valid project in Engineering with Backend Team
    create_resp = client.post(
        "/api/v1/projects",
        json={
            "project_code": "PRJ-TEST-04",
            "name": "Original Eng Project",
            "department_id": org_setup["dept_eng"].id,
            "team_id": org_setup["team_be"].id,
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    prj_id = create_resp.json()["id"]

    # Update project to Marketing Department with Growth Team (Valid pair)
    update_resp = client.put(
        f"/api/v1/projects/{prj_id}",
        json={
            "department_id": org_setup["dept_mkt"].id,
            "team_id": org_setup["team_growth"].id,
        },
        headers=headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["department_id"] == org_setup["dept_mkt"].id
    assert updated["team_id"] == org_setup["team_growth"].id
    assert updated["department_name"] == "Marketing"
    assert updated["team_name"] == "Growth Team"


def test_05_project_member_department_and_team_constraints(
    client: TestClient, org_setup: dict
):
    headers = get_auth_headers(client, org_setup["admin"].email)
    # Create project in Engineering & Backend Team
    create_resp = client.post(
        "/api/v1/projects",
        json={
            "project_code": "PRJ-MEM-01",
            "name": "Member Test Project",
            "department_id": org_setup["dept_eng"].id,
            "team_id": org_setup["team_be"].id,
        },
        headers=headers,
    )
    prj_id = create_resp.json()["id"]

    # Add Dev BE (matches Eng Dept & BE Team) -> Should Succeed
    add_dev = client.post(
        f"/api/v1/projects/{prj_id}/members",
        json={"employee_id": org_setup["dev_be"].id},
        headers=headers,
    )
    assert add_dev.status_code == 201, add_dev.text

    # Attempt Duplicate Member -> Should return 409 MEMBER_ALREADY_IN_PROJECT
    dup_dev = client.post(
        f"/api/v1/projects/{prj_id}/members",
        json={"employee_id": org_setup["dev_be"].id},
        headers=headers,
    )
    assert dup_dev.status_code == 409, dup_dev.text
    assert dup_dev.json()["error_code"] == "MEMBER_ALREADY_IN_PROJECT"

    # Attempt Mkt Spec (different Department/Team) -> Should return 409
    add_mkt = client.post(
        f"/api/v1/projects/{prj_id}/members",
        json={"employee_id": org_setup["mkt_spec"].id},
        headers=headers,
    )
    assert add_mkt.status_code == 409, add_mkt.text


def test_06_task_assignee_validation_and_project_change(
    client: TestClient, org_setup: dict, db: Session
):
    headers = get_auth_headers(client, org_setup["admin"].email)

    # Create Project A & Project B
    prj_a = client.post(
        "/api/v1/projects",
        json={
            "project_code": "PRJ-TSK-A",
            "name": "Task Project A",
            "department_id": org_setup["dept_eng"].id,
        },
        headers=headers,
    ).json()
    prj_b = client.post(
        "/api/v1/projects",
        json={
            "project_code": "PRJ-TSK-B",
            "name": "Task Project B",
            "department_id": org_setup["dept_eng"].id,
        },
        headers=headers,
    ).json()

    # Add Dev BE as member of Project A
    client.post(
        f"/api/v1/projects/{prj_a['id']}/members",
        json={"employee_id": org_setup["dev_be"].id},
        headers=headers,
    )

    # Create Sprint in Project A
    sprint_a = client.post(
        "/api/v1/sprints",
        json={
            "project_id": prj_a["id"],
            "name": "Sprint 1",
            "start_date": "2026-08-01",
            "end_date": "2026-08-14",
            "status": "Planned",
        },
        headers=headers,
    ).json()

    # Create Task in Project A assigned to Dev BE in Sprint A
    task_resp = client.post(
        "/api/v1/tasks",
        json={
            "project_id": prj_a["id"],
            "sprint_id": sprint_a["id"],
            "title": "Build Auth API",
            "assigned_to": org_setup["dev_be"].id,
            "status": "To Do",
            "priority": "High",
        },
        headers=headers,
    )
    assert task_resp.status_code in (200, 201), task_resp.text
    task_data = task_resp.json()

    # Update Task Project to Project B -> Sprint and Assigned_To should be cleared
    update_task_resp = client.put(
        f"/api/v1/tasks/{task_data['id']}",
        json={"project_id": prj_b["id"]},
        headers=headers,
    )
    assert update_task_resp.status_code == 200, update_task_resp.text
    updated_task = update_task_resp.json()
    assert updated_task["project_id"] == prj_b["id"]
    assert updated_task["sprint_id"] is None
    assert updated_task["assigned_to"] is None

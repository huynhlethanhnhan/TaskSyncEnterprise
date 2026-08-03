"""
Contract tests for POST /api/v1/teams.
Cases:
- Admin creates Team with valid payload → 201
- Duplicate team_code → 409
- Missing required fields → 422
- leader_id = 0 is coerced to None (no 409)
"""

import uuid
import pytest
from app.models.role import Role
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.core.constants import ROLE_MANAGER, ROLE_EMPLOYEE
from app.core.security import get_password_hash


def _ensure_setup(db):
    admin_role = db.query(Role).filter(Role.role_name == "Admin").first()
    if not admin_role:
        admin_role = Role(role_name="Admin")
        db.add(admin_role)
        db.commit()

    dept = db.query(Department).filter(Department.department_code == "IT-TEAM").first()
    if not dept:
        dept = Department(
            name="IT Team Test", department_code="IT-TEAM", is_active=True
        )
        db.add(dept)
        db.commit()

    admin = db.query(Employee).filter(Employee.email == "team_adm@teamtest.com").first()
    if not admin:
        admin = Employee(
            employee_code="EMP-TEAM-ADM",
            full_name="Team Contract Admin",
            email="team_adm@teamtest.com",
            password_hash=get_password_hash("TaskSync@2026"),
            role_id=admin_role.id,
            department_id=dept.id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    return dept, admin


from app.core.security import create_access_token


def _admin_token(admin):
    return create_access_token(data={"sub": str(admin.id)})


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_admin_creates_team_valid(client, db):
    """Admin creates a valid Team → 201 with id and is_active."""
    dept, admin = _ensure_setup(db)
    dept_id = dept.id
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    code = f"TC-{uuid.uuid4().hex[:6].upper()}"
    resp = client.post(
        "/api/v1/teams",
        json={
            "team_code": code,
            "name": f"Team Contract {code}",
            "department_id": dept_id,
            "leader_id": None,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.json()
    data = resp.json()
    assert data["team_code"] == code
    assert data["is_active"] is True


def test_duplicate_team_code_returns_409(client, db):
    """Creating a second Team with the same team_code → 409."""
    dept, admin = _ensure_setup(db)
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "team_code": "TEAM-DUP-FIXED",
        "name": "Dup Team Fixed",
        "department_id": dept.id,
    }
    r1 = client.post("/api/v1/teams", json=payload, headers=headers)
    assert r1.status_code == 201, r1.json()

    r2 = client.post("/api/v1/teams", json=payload, headers=headers)
    assert r2.status_code == 409, r2.json()


def test_missing_required_team_fields_returns_422(client, db):
    """Omitting team_code and department_id → 422."""
    dept, admin = _ensure_setup(db)
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/v1/teams", json={"name": "No Code Team"}, headers=headers)
    assert resp.status_code == 422, resp.json()


def test_leader_id_zero_coerced_to_none(client, db):
    """Sending leader_id=0 must not cause a 409 (it should be coerced to None)."""
    dept, admin = _ensure_setup(db)
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    code = f"TLZ-{uuid.uuid4().hex[:6].upper()}"
    resp = client.post(
        "/api/v1/teams",
        json={
            "team_code": code,
            "name": f"Leader Zero {code}",
            "department_id": dept.id,
            "leader_id": 0,
        },
        headers=headers,
    )
    # Must succeed — 0 should be treated as no-leader
    assert resp.status_code == 201, resp.json()


def test_empty_string_ids_normalized_or_422(client, db):
    """Sending empty string for team_code → rejected (409 for empty unique or 422 for validation)."""
    dept, admin = _ensure_setup(db)
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/v1/teams",
        json={
            "team_code": "",
            "name": "Empty Code Team",
            "department_id": dept.id,
        },
        headers=headers,
    )
    # Empty required string fields should be rejected — exact code is 409 or 422
    assert resp.status_code == 422, resp.json()
    assert resp.json()["details"][0]["loc"] == ["body", "team_code"]


@pytest.mark.parametrize(
    ("payload_override", "expected_field"),
    [
        ({"team_code": "   "}, "team_code"),
        ({"name": ""}, "name"),
        ({"name": "   "}, "name"),
    ],
)
def test_blank_required_team_text_returns_422(
    client, db, payload_override, expected_field
):
    dept, admin = _ensure_setup(db)
    token = _admin_token(admin)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "team_code": f"VALID-{uuid.uuid4().hex[:6].upper()}",
        "name": "Valid Team Name",
        "department_id": dept.id,
        **payload_override,
    }

    response = client.post("/api/v1/teams", json=payload, headers=headers)

    assert response.status_code == 422, response.json()
    assert response.json()["details"][0]["loc"] == ["body", expected_field]


def test_manager_can_change_team_leader_but_not_other_team_fields(client, db):
    dept, _ = _ensure_setup(db)
    manager_role = Role(role_name="Manager")
    employee_role = Role(role_name="Employee")
    db.add_all([manager_role, employee_role])
    db.flush()
    manager = Employee(
        employee_code="EMP-TEAM-MGR",
        full_name="Team Contract Manager",
        email="team_mgr@teamtest.com",
        password_hash="test",
        role_id=ROLE_MANAGER,
        department_id=dept.id,
        is_active=True,
        is_deleted=False,
    )
    leader = Employee(
        employee_code="EMP-TEAM-LEAD",
        full_name="Team Contract Leader",
        email="team_lead@teamtest.com",
        password_hash="test",
        role_id=ROLE_EMPLOYEE,
        department_id=dept.id,
        is_active=True,
        is_deleted=False,
    )
    db.add_all([manager, leader])
    db.flush()
    team = Team(
        department_id=dept.id,
        team_code="TEAM-MGR-LEADER",
        name="Manager Leader Team",
        is_active=True,
    )
    db.add(team)
    db.commit()

    headers = {"Authorization": f"Bearer {_admin_token(manager)}"}
    response = client.put(
        f"/api/v1/teams/{team.id}",
        json={"leader_id": leader.id},
        headers=headers,
    )
    assert response.status_code == 200, response.json()
    assert response.json()["leader_id"] == leader.id

    response = client.put(
        f"/api/v1/teams/{team.id}",
        json={"name": "Manager must not rename"},
        headers=headers,
    )
    assert response.status_code == 403, response.json()


def test_employee_cannot_change_team_leader(client, db):
    dept, _ = _ensure_setup(db)
    manager_role = Role(role_name="Manager")
    employee_role = Role(role_name="Employee")
    db.add_all([manager_role, employee_role])
    db.flush()
    employee = Employee(
        employee_code="EMP-TEAM-RBAC",
        full_name="Team Contract Employee",
        email="team_employee@teamtest.com",
        password_hash="test",
        role_id=ROLE_EMPLOYEE,
        department_id=dept.id,
        is_active=True,
        is_deleted=False,
    )
    db.add(employee)
    db.flush()
    team = Team(
        department_id=dept.id,
        team_code="TEAM-EMP-RBAC",
        name="Employee RBAC Team",
        is_active=True,
    )
    db.add(team)
    db.commit()

    headers = {"Authorization": f"Bearer {_admin_token(employee)}"}
    response = client.put(
        f"/api/v1/teams/{team.id}",
        json={"leader_id": employee.id},
        headers=headers,
    )
    assert response.status_code == 403, response.json()

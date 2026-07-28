from datetime import datetime

import pytest
from fastapi import HTTPException

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.crud import department as crud_department
from app.crud import employee as crud_employee
from app.crud import team as crud_team
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.schemas.employee import EmployeeUpdate


def _department(code: str, name: str) -> Department:
    return Department(
        department_code=code,
        name=name,
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )


def _team(department_id: int, code: str, name: str) -> Team:
    return Team(
        department_id=department_id,
        team_code=code,
        name=name,
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )


def _employee(
    code: str,
    email: str,
    role_id: int,
    department_id: int | None = None,
    team_id: int | None = None,
) -> Employee:
    return Employee(
        employee_code=code,
        full_name=code,
        email=email,
        password_hash="test",
        role_id=role_id,
        department_id=department_id,
        team_id=team_id,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )


def test_admin_team_assignment_list_includes_all_active_teams_even_when_empty(db):
    department = _department("OPS", "Vận hành")
    db.add(department)
    db.flush()

    occupied_team = _team(department.id, "OPS-1", "Vận hành nhóm 1")
    empty_team = _team(department.id, "OPS-2", "Vận hành nhóm 2")
    db.add_all([occupied_team, empty_team])
    db.flush()

    member = _employee(
        "EMP-1",
        "member@example.com",
        ROLE_EMPLOYEE,
        department.id,
        occupied_team.id,
    )
    db.add(member)
    db.commit()

    admin = _employee("ADMIN", "admin@example.com", ROLE_ADMIN)
    teams = crud_team.get_all(
        db,
        current_user=admin,
        department_id=department.id,
    )

    assert {team["name"] for team in teams} == {
        "Vận hành nhóm 1",
        "Vận hành nhóm 2",
    }
    assert (
        next(team for team in teams if team["id"] == empty_team.id)["member_count"] == 0
    )


def test_manager_team_visibility_is_limited_to_own_department(db):
    first_department = _department("OPS", "Vận hành")
    second_department = _department("ENG", "Kỹ thuật")
    db.add_all([first_department, second_department])
    db.flush()

    own_team = _team(first_department.id, "OPS-1", "Vận hành nhóm 1")
    unrelated_team = _team(second_department.id, "ENG-1", "Kỹ thuật nhóm 1")
    db.add_all([own_team, unrelated_team])
    db.commit()

    manager = _employee(
        "MANAGER",
        "manager@example.com",
        ROLE_MANAGER,
        department_id=first_department.id,
    )

    teams = crud_team.get_all(db, current_user=manager)

    assert [team["id"] for team in teams] == [own_team.id]

    visible_departments = crud_department.get_all(
        db,
        current_user=manager,
    )
    assert [department["id"] for department in visible_departments] == [
        first_department.id
    ]


def test_department_move_clears_an_incompatible_team(db):
    first_department = _department("OPS", "Vận hành")
    second_department = _department("ENG", "Kỹ thuật")
    db.add_all([first_department, second_department])
    db.flush()

    old_team = _team(first_department.id, "OPS-1", "Vận hành nhóm 1")
    db.add(old_team)
    db.flush()

    employee = _employee(
        "EMP-1",
        "employee@example.com",
        ROLE_EMPLOYEE,
        first_department.id,
        old_team.id,
    )
    db.add(employee)
    db.commit()

    updated = crud_employee.update(
        db,
        employee,
        EmployeeUpdate(department_id=second_department.id),
    )

    assert updated.department_id == second_department.id
    assert updated.team_id is None


def test_employee_rejects_explicit_cross_department_team_assignment(db):
    first_department = _department("OPS", "Vận hành")
    second_department = _department("ENG", "Kỹ thuật")
    db.add_all([first_department, second_department])
    db.flush()
    foreign_team = _team(second_department.id, "ENG-1", "Kỹ thuật nhóm 1")
    db.add(foreign_team)
    db.flush()
    employee = _employee(
        "EMP-1",
        "employee@example.com",
        ROLE_EMPLOYEE,
        first_department.id,
    )
    db.add(employee)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        crud_employee.update(
            db,
            employee,
            EmployeeUpdate(
                department_id=first_department.id,
                team_id=foreign_team.id,
            ),
        )

    assert exc_info.value.status_code == 409


def test_empty_department_and_team_details_are_valid(db):
    department = _department("OPS", "Vận hành")
    db.add(department)
    db.flush()
    team = _team(department.id, "OPS-1", "Vận hành nhóm 1")
    db.add(team)
    db.commit()

    department_detail = crud_department.get_detail(db, department.id)
    team_detail = crud_team.get_detail(db, team.id)

    assert department_detail["employee_count"] == 0
    assert department_detail["team_count"] == 1
    assert department_detail["members"] == []
    assert department_detail["teams"][0]["member_count"] == 0
    assert team_detail["member_count"] == 0
    assert team_detail["members"] == []
    assert team_detail["department_name"] == department.name


def test_nonempty_department_and_team_cannot_be_deactivated(db):
    department = _department("OPS", "Vận hành")
    db.add(department)
    db.flush()
    team = _team(department.id, "OPS-1", "Vận hành nhóm 1")
    db.add(team)
    db.flush()
    employee = _employee(
        "EMP-1",
        "employee@example.com",
        ROLE_EMPLOYEE,
        department.id,
        team.id,
    )
    db.add(employee)
    db.commit()

    with pytest.raises(HTTPException) as department_error:
        crud_department.delete(db, department)
    with pytest.raises(HTTPException) as team_error:
        crud_team.delete(db, team)

    assert department_error.value.status_code == 409
    assert team_error.value.status_code == 409

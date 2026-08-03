from datetime import datetime

import pytest
from fastapi import HTTPException

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.crud import department as crud_department
from app.crud import employee as crud_employee
from app.crud import project as crud_project
from app.crud import team as crud_team
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
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


def test_employee_team_list_includes_every_team_they_lead(db):
    department = _department("OPS", "Vận hành")
    db.add(department)
    db.flush()

    first_team = _team(department.id, "OPS-1", "Vận hành — Nhóm 1")
    second_team = _team(department.id, "OPS-2", "Vận hành — Nhóm 2")
    db.add_all([first_team, second_team])
    db.flush()

    leader = _employee(
        "EMP-LEAD",
        "leader@example.com",
        ROLE_EMPLOYEE,
        department.id,
        second_team.id,
    )
    db.add(leader)
    db.flush()
    first_team.leader_id = leader.id
    second_team.leader_id = leader.id
    db.commit()

    teams = crud_team.get_all(db, current_user=leader)

    assert {team["id"] for team in teams} == {first_team.id, second_team.id}


def test_department_metrics_follow_project_membership(db):
    department = _department("OPS", "Vận hành")
    db.add(department)
    db.flush()
    member = _employee(
        "EMP-1",
        "employee@example.com",
        ROLE_EMPLOYEE,
        department.id,
    )
    db.add(member)
    db.flush()

    active_project = Project(
        project_code="PRJ-1",
        name="Active project",
        status="In Progress",
        priority="Medium",
        progress_percent=20,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    completed_project = Project(
        project_code="PRJ-2",
        name="Completed project",
        status="Completed",
        priority="Medium",
        progress_percent=100,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add_all([active_project, completed_project])
    db.flush()
    db.add_all(
        [
            ProjectMember(project_id=active_project.id, employee_id=member.id),
            ProjectMember(project_id=completed_project.id, employee_id=member.id),
            Sprint(
                project_id=active_project.id,
                name="Sprint 1",
                status="Active",
                capacity=10,
                is_deleted=False,
                created_at=datetime(2026, 1, 1),
            ),
            Sprint(
                project_id=completed_project.id,
                name="Sprint 2",
                status="Completed",
                capacity=10,
                is_deleted=False,
                created_at=datetime(2026, 1, 1),
            ),
        ]
    )
    db.commit()

    result = crud_department.get_all(db, current_user=member)[0]

    assert result["project_count"] == 2
    assert result["completed_project_count"] == 1
    assert result["sprint_count"] == 2


def test_project_filters_follow_member_department_and_team(db):
    department = _department("OPS", "Vận hành")
    other_department = _department("IT", "Công nghệ")
    db.add_all([department, other_department])
    db.flush()
    team = _team(department.id, "OPS-1", "Vận hành nhóm 1")
    db.add(team)
    db.flush()
    admin = _employee("ADM-1", "admin@example.com", ROLE_ADMIN)
    member = _employee(
        "EMP-1",
        "member@example.com",
        ROLE_EMPLOYEE,
        department.id,
        team.id,
    )
    db.add_all([admin, member])
    db.flush()
    member_project = Project(
        project_code="PRJ-MEMBER",
        name="Member-linked project",
        status="Completed",
        priority="Medium",
        progress_percent=100,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    other_project = Project(
        project_code="PRJ-OTHER",
        name="Other project",
        status="Active",
        priority="Medium",
        progress_percent=10,
        department_id=other_department.id,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )
    db.add_all([member_project, other_project])
    db.flush()
    db.add(ProjectMember(project_id=member_project.id, employee_id=member.id))
    db.commit()

    department_projects = crud_project.get_all(db, admin, department_id=department.id)
    team_projects = crud_project.get_all(db, admin, team_id=team.id)
    completed_projects = crud_project.get_all(
        db, admin, department_id=department.id, status="Completed"
    )

    assert [project.id for project in department_projects] == [member_project.id]
    assert [project.id for project in team_projects] == [member_project.id]
    assert [project.id for project in completed_projects] == [member_project.id]


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

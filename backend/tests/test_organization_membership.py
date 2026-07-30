from datetime import datetime

import pytest
from fastapi import HTTPException

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team
from app.services import organization_membership


def _department(code: str) -> Department:
    return Department(
        department_code=code,
        name=code,
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )


def _team(department_id: int, code: str) -> Team:
    return Team(
        department_id=department_id,
        team_code=code,
        name=code,
        is_active=True,
        created_at=datetime(2026, 1, 1),
    )


def _employee(
    code: str,
    role_id: int,
    *,
    department_id: int | None = None,
    team_id: int | None = None,
) -> Employee:
    return Employee(
        employee_code=code,
        full_name=code,
        email=f"{code.lower()}@example.com",
        password_hash="test",
        role_id=role_id,
        department_id=department_id,
        team_id=team_id,
        is_active=True,
        is_deleted=False,
        created_at=datetime(2026, 1, 1),
    )


def test_admin_can_add_transfer_and_remove_department_member(db):
    source = _department("OPS")
    target = _department("ENG")
    admin = _employee("ADMIN", ROLE_ADMIN)
    employee = _employee("EMP", ROLE_EMPLOYEE)
    db.add_all([source, target, admin, employee])
    db.commit()

    organization_membership.add_department_member(
        db,
        department_id=source.id,
        employee_id=employee.id,
        current_user=admin,
    )
    assert employee.department_id == source.id

    organization_membership.transfer_department_member(
        db,
        department_id=source.id,
        target_department_id=target.id,
        employee_id=employee.id,
        current_user=admin,
    )
    assert employee.department_id == target.id

    organization_membership.remove_department_member(
        db,
        department_id=target.id,
        employee_id=employee.id,
        current_user=admin,
    )
    assert employee.department_id is None
    assert employee.team_id is None


def test_manager_can_transfer_employee_but_cannot_move_self_or_another_manager(db):
    source = _department("OPS")
    target = _department("ENG")
    db.add_all([source, target])
    db.flush()
    manager = _employee("MANAGER", ROLE_MANAGER, department_id=source.id)
    employee = _employee("EMP", ROLE_EMPLOYEE, department_id=source.id)
    peer_manager = _employee("PEER", ROLE_MANAGER, department_id=source.id)
    db.add_all([manager, employee, peer_manager])
    db.commit()

    organization_membership.transfer_department_member(
        db,
        department_id=source.id,
        target_department_id=target.id,
        employee_id=employee.id,
        current_user=manager,
    )
    assert employee.department_id == target.id

    for protected_employee in (manager, peer_manager):
        with pytest.raises(HTTPException) as exc_info:
            organization_membership.transfer_department_member(
                db,
                department_id=source.id,
                target_department_id=target.id,
                employee_id=protected_employee.id,
                current_user=manager,
            )
        assert exc_info.value.status_code == 403


def test_manager_cannot_manage_members_of_another_department(db):
    own_department = _department("OPS")
    foreign_department = _department("ENG")
    db.add_all([own_department, foreign_department])
    db.flush()
    manager = _employee("MANAGER", ROLE_MANAGER, department_id=own_department.id)
    employee = _employee("EMP", ROLE_EMPLOYEE, department_id=foreign_department.id)
    db.add_all([manager, employee])
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        organization_membership.remove_department_member(
            db,
            department_id=foreign_department.id,
            employee_id=employee.id,
            current_user=manager,
        )

    assert exc_info.value.status_code == 403
    assert employee.department_id == foreign_department.id


def test_team_leader_can_manage_employees_but_cannot_remove_self(db):
    department = _department("OPS")
    db.add(department)
    db.flush()
    source = _team(department.id, "OPS-1")
    target = _team(department.id, "OPS-2")
    db.add_all([source, target])
    db.flush()
    leader = _employee(
        "LEADER",
        ROLE_EMPLOYEE,
        department_id=department.id,
        team_id=source.id,
    )
    employee = _employee("EMP", ROLE_EMPLOYEE, department_id=department.id)
    db.add_all([leader, employee])
    db.flush()
    source.leader_id = leader.id
    db.commit()

    organization_membership.add_team_member(
        db,
        team_id=source.id,
        employee_id=employee.id,
        current_user=leader,
    )
    assert employee.team_id == source.id

    organization_membership.transfer_team_member(
        db,
        team_id=source.id,
        target_team_id=target.id,
        employee_id=employee.id,
        current_user=leader,
    )
    assert employee.team_id == target.id

    with pytest.raises(HTTPException) as exc_info:
        organization_membership.remove_team_member(
            db,
            team_id=source.id,
            employee_id=leader.id,
            current_user=leader,
        )
    assert exc_info.value.status_code == 403
    assert leader.team_id == source.id


def test_team_transfer_rejects_cross_department_destination(db):
    source_department = _department("OPS")
    target_department = _department("ENG")
    db.add_all([source_department, target_department])
    db.flush()
    source = _team(source_department.id, "OPS-1")
    target = _team(target_department.id, "ENG-1")
    db.add_all([source, target])
    db.flush()
    admin = _employee("ADMIN", ROLE_ADMIN)
    employee = _employee(
        "EMP",
        ROLE_EMPLOYEE,
        department_id=source_department.id,
        team_id=source.id,
    )
    db.add_all([admin, employee])
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        organization_membership.transfer_team_member(
            db,
            team_id=source.id,
            target_team_id=target.id,
            employee_id=employee.id,
            current_user=admin,
        )

    assert exc_info.value.status_code == 409
    assert employee.team_id == source.id


def test_non_admin_candidates_only_include_employees(db):
    department = _department("OPS")
    db.add(department)
    db.flush()
    manager = _employee("MANAGER", ROLE_MANAGER, department_id=department.id)
    employee = _employee("EMP", ROLE_EMPLOYEE)
    other_manager = _employee("OTHER", ROLE_MANAGER)
    db.add_all([manager, employee, other_manager])
    db.commit()

    candidates = organization_membership.get_department_candidates(
        db,
        department_id=department.id,
        current_user=manager,
    )

    assert [candidate.id for candidate in candidates] == [employee.id]


def test_transfer_targets_are_scoped_to_the_allowed_organization_level(db):
    source_department = _department("OPS")
    target_department = _department("ENG")
    db.add_all([source_department, target_department])
    db.flush()
    source_team = _team(source_department.id, "OPS-1")
    sibling_team = _team(source_department.id, "OPS-2")
    foreign_team = _team(target_department.id, "ENG-1")
    db.add_all([source_team, sibling_team, foreign_team])
    db.flush()
    manager = _employee(
        "MANAGER",
        ROLE_MANAGER,
        department_id=source_department.id,
    )
    leader = _employee(
        "LEADER",
        ROLE_EMPLOYEE,
        department_id=source_department.id,
        team_id=source_team.id,
    )
    db.add_all([manager, leader])
    db.flush()
    source_team.leader_id = leader.id
    db.commit()

    department_targets = organization_membership.get_department_transfer_targets(
        db,
        department_id=source_department.id,
        current_user=manager,
    )
    team_targets = organization_membership.get_team_transfer_targets(
        db,
        team_id=source_team.id,
        current_user=leader,
    )

    assert [department.id for department in department_targets] == [
        target_department.id
    ]
    assert [team.id for team in team_targets] == [sibling_team.id]


def test_only_admin_can_move_an_active_team_leader_between_departments(db):
    source_department = _department("OPS")
    target_department = _department("ENG")
    db.add_all([source_department, target_department])
    db.flush()
    team = _team(source_department.id, "OPS-1")
    db.add(team)
    db.flush()
    manager = _employee(
        "MANAGER",
        ROLE_MANAGER,
        department_id=source_department.id,
    )
    admin = _employee("ADMIN", ROLE_ADMIN)
    leader = _employee(
        "LEADER",
        ROLE_EMPLOYEE,
        department_id=source_department.id,
        team_id=team.id,
    )
    db.add_all([manager, admin, leader])
    db.flush()
    team.leader_id = leader.id
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        organization_membership.transfer_department_member(
            db,
            department_id=source_department.id,
            target_department_id=target_department.id,
            employee_id=leader.id,
            current_user=manager,
        )
    assert exc_info.value.status_code == 409

    organization_membership.transfer_department_member(
        db,
        department_id=source_department.id,
        target_department_id=target_department.id,
        employee_id=leader.id,
        current_user=admin,
    )

    assert leader.department_id == target_department.id
    assert leader.team_id is None
    assert team.leader_id is None


def test_admin_team_transfer_clears_source_leader_assignment(db):
    department = _department("OPS")
    db.add(department)
    db.flush()
    source = _team(department.id, "OPS-1")
    target = _team(department.id, "OPS-2")
    db.add_all([source, target])
    db.flush()
    admin = _employee("ADMIN", ROLE_ADMIN)
    leader = _employee(
        "LEADER",
        ROLE_EMPLOYEE,
        department_id=department.id,
        team_id=source.id,
    )
    db.add_all([admin, leader])
    db.flush()
    source.leader_id = leader.id
    db.commit()

    organization_membership.transfer_team_member(
        db,
        team_id=source.id,
        target_team_id=target.id,
        employee_id=leader.id,
        current_user=admin,
    )

    assert leader.team_id == target.id
    assert source.leader_id is None

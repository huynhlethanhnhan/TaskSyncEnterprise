from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.constants import ROLE_ADMIN, ROLE_EMPLOYEE, ROLE_MANAGER
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team


def _not_found(entity: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{entity} not found or inactive.",
    )


def _get_employee(db: Session, employee_id: int) -> Employee:
    employee = db.scalar(
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(
            Employee.id == employee_id,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if employee is None:
        raise _not_found("Employee")
    return employee


def _get_department(db: Session, department_id: int) -> Department:
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.is_active == True,  # noqa: E712
        )
    )
    if department is None:
        raise _not_found("Department")
    return department


def _get_team(db: Session, team_id: int) -> Team:
    team = db.scalar(
        select(Team).where(
            Team.id == team_id,
            Team.is_active == True,  # noqa: E712
        )
    )
    if team is None:
        raise _not_found("Team")
    return team


def _ensure_subordinate(current_user: Employee, employee: Employee) -> None:
    if current_user.role_id == ROLE_ADMIN:
        return
    if employee.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers and Team Leaders cannot move or remove themselves.",
        )
    if employee.role_id != ROLE_EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers and Team Leaders can only manage employees.",
        )


def _ensure_department_manager(
    current_user: Employee,
    department_id: int,
) -> None:
    if current_user.role_id == ROLE_ADMIN:
        return
    if (
        current_user.role_id == ROLE_MANAGER
        and current_user.department_id == department_id
    ):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot manage members of this Department.",
    )


def _ensure_team_manager(current_user: Employee, team: Team) -> None:
    if current_user.role_id == ROLE_ADMIN:
        return
    if (
        current_user.role_id == ROLE_MANAGER
        and current_user.department_id == team.department_id
    ):
        return
    if team.leader_id == current_user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot manage members of this Team.",
    )


def _prepare_department_departure(
    db: Session,
    *,
    department: Department,
    employee: Employee,
    current_user: Employee,
) -> None:
    led_teams = list(
        db.scalars(
            select(Team).where(
                Team.leader_id == employee.id,
                Team.is_active == True,  # noqa: E712
            )
        ).all()
    )
    if led_teams and current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only an Admin can move an active Team Leader.",
        )
    if current_user.role_id == ROLE_ADMIN:
        for team in led_teams:
            team.leader_id = None
        if department.manager_id == employee.id:
            department.manager_id = None


def _prepare_team_departure(
    *,
    team: Team,
    employee: Employee,
    current_user: Employee,
) -> None:
    if team.leader_id != employee.id:
        return
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only an Admin can move the active Team Leader.",
        )
    team.leader_id = None


def get_related_team_ids(
    db: Session,
    *,
    department_id: int,
    employee_id: int,
    current_user: Employee,
) -> set[int]:
    _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    employee = _get_employee(db, employee_id)
    team_ids = set(
        db.scalars(
            select(Team.id).where(
                Team.leader_id == employee_id,
                Team.is_active == True,  # noqa: E712
            )
        ).all()
    )
    if employee.team_id is not None:
        team_ids.add(employee.team_id)
    return team_ids


def get_department_candidates(
    db: Session,
    *,
    department_id: int,
    current_user: Employee,
) -> list[Employee]:
    _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    stmt = (
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(
            Employee.department_id.is_(None),
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
        .order_by(Employee.full_name.asc())
    )
    if current_user.role_id != ROLE_ADMIN:
        stmt = stmt.where(Employee.role_id == ROLE_EMPLOYEE)
    return list(db.scalars(stmt).all())


def get_department_transfer_targets(
    db: Session,
    *,
    department_id: int,
    current_user: Employee,
) -> list[Department]:
    _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    return list(
        db.scalars(
            select(Department)
            .where(
                Department.id != department_id,
                Department.is_active == True,  # noqa: E712
            )
            .order_by(Department.name.asc())
        ).all()
    )


def add_department_member(
    db: Session,
    *,
    department_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.department_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee already belongs to a Department; use transfer instead.",
        )
    employee.department_id = department_id
    employee.team_id = None
    db.commit()
    db.refresh(employee)
    return employee


def remove_department_member(
    db: Session,
    *,
    department_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    department = _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.department_id != department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee does not belong to this Department.",
        )
    _prepare_department_departure(
        db,
        department=department,
        employee=employee,
        current_user=current_user,
    )
    employee.department_id = None
    employee.team_id = None
    db.commit()
    db.refresh(employee)
    return employee


def transfer_department_member(
    db: Session,
    *,
    department_id: int,
    target_department_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    department = _get_department(db, department_id)
    _ensure_department_manager(current_user, department_id)
    _get_department(db, target_department_id)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.department_id != department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee does not belong to the source Department.",
        )
    if target_department_id == department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source and target Departments must be different.",
        )
    _prepare_department_departure(
        db,
        department=department,
        employee=employee,
        current_user=current_user,
    )
    employee.department_id = target_department_id
    employee.team_id = None
    db.commit()
    db.refresh(employee)
    return employee


def get_team_candidates(
    db: Session,
    *,
    team_id: int,
    current_user: Employee,
) -> list[Employee]:
    team = _get_team(db, team_id)
    _ensure_team_manager(current_user, team)
    stmt = (
        select(Employee)
        .options(selectinload(Employee.department), selectinload(Employee.team))
        .where(
            Employee.department_id == team.department_id,
            Employee.team_id.is_(None),
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
        .order_by(Employee.full_name.asc())
    )
    if current_user.role_id != ROLE_ADMIN:
        stmt = stmt.where(Employee.role_id == ROLE_EMPLOYEE)
    return list(db.scalars(stmt).all())


def get_team_transfer_targets(
    db: Session,
    *,
    team_id: int,
    current_user: Employee,
) -> list[Team]:
    team = _get_team(db, team_id)
    _ensure_team_manager(current_user, team)
    return list(
        db.scalars(
            select(Team)
            .where(
                Team.id != team_id,
                Team.department_id == team.department_id,
                Team.is_active == True,  # noqa: E712
            )
            .order_by(Team.name.asc())
        ).all()
    )


def add_team_member(
    db: Session,
    *,
    team_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    team = _get_team(db, team_id)
    _ensure_team_manager(current_user, team)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.department_id != team.department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee and Team must belong to the same Department.",
        )
    if employee.team_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee already belongs to a Team; use transfer instead.",
        )
    employee.team_id = team_id
    db.commit()
    db.refresh(employee)
    return employee


def remove_team_member(
    db: Session,
    *,
    team_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    team = _get_team(db, team_id)
    _ensure_team_manager(current_user, team)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee does not belong to this Team.",
        )
    _prepare_team_departure(
        team=team,
        employee=employee,
        current_user=current_user,
    )
    employee.team_id = None
    db.commit()
    db.refresh(employee)
    return employee


def transfer_team_member(
    db: Session,
    *,
    team_id: int,
    target_team_id: int,
    employee_id: int,
    current_user: Employee,
) -> Employee:
    source_team = _get_team(db, team_id)
    _ensure_team_manager(current_user, source_team)
    target_team = _get_team(db, target_team_id)
    employee = _get_employee(db, employee_id)
    _ensure_subordinate(current_user, employee)
    if employee.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee does not belong to the source Team.",
        )
    if target_team_id == team_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source and target Teams must be different.",
        )
    if target_team.department_id != source_team.department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team transfers must stay within the same Department.",
        )
    _prepare_team_departure(
        team=source_team,
        employee=employee,
        current_user=current_user,
    )
    employee.team_id = target_team_id
    db.commit()
    db.refresh(employee)
    return employee

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.models.department import Department
from app.models.employee import Employee
from app.models.team import Team


def validate_team_organization(
    db: Session,
    *,
    department_id: int,
    leader_id: int | None,
) -> None:
    department = db.scalar(
        select(Department).where(
            Department.id == department_id,
            Department.is_active == True,  # noqa: E712
        )
    )
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department does not exist or is inactive.",
        )

    if leader_id is None:
        return

    leader = db.scalar(
        select(Employee).where(
            Employee.id == leader_id,
            Employee.is_active == True,  # noqa: E712
            Employee.is_deleted == False,  # noqa: E712
        )
    )
    if leader is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team leader does not exist or is inactive.",
        )
    if leader.department_id != department_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Team leader must belong to the Team's Department.",
        )


def can_view_team(current_user: Employee, team: Team | dict) -> bool:
    team_id = team.id if isinstance(team, Team) else team["id"]
    department_id = (
        team.department_id if isinstance(team, Team) else team["department_id"]
    )
    leader_id = team.leader_id if isinstance(team, Team) else team["leader_id"]

    if current_user.role_id == ROLE_ADMIN:
        return True
    if current_user.role_id == ROLE_MANAGER:
        return (
            current_user.department_id is not None
            and current_user.department_id == department_id
        )
    return current_user.team_id == team_id or leader_id == current_user.id

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.team import Team


def get_active_project(db: Session, project_id: int) -> Project:
    project = db.scalar(
        select(Project).where(
            Project.id == project_id,
            Project.is_deleted == False,  # noqa: E712
        )
    )
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )
    return project


def user_can_access_project(
    db: Session,
    project: Project,
    current_user: Employee,
) -> bool:
    if current_user.role_id == ROLE_ADMIN:
        return True
    if project.created_by == current_user.id:
        return True
    membership_id = db.scalar(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project.id,
            ProjectMember.employee_id == current_user.id,
        )
    )
    return membership_id is not None


def require_project_access(
    db: Session,
    project_id: int,
    current_user: Employee,
) -> Project:
    project = get_active_project(db, project_id)
    if not user_can_access_project(db, project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this Project.",
        )
    return project


def require_project_management(
    db: Session,
    project_id: int,
    current_user: Employee,
) -> Project:
    project = require_project_access(db, project_id, current_user)
    is_team_leader = db.scalar(
        select(Team.id).where(
            Team.leader_id == current_user.id,
            Team.is_active == True,  # noqa: E712
        )
    )
    if (
        current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER)
        and is_team_leader is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an authorized Manager or Team Leader can modify this Project.",
        )
    return project


def project_scope_predicate(current_user: Employee):
    if current_user.role_id == ROLE_ADMIN:
        return None
    return or_(
        Project.created_by == current_user.id,
        Project.id.in_(
            select(ProjectMember.project_id).where(
                ProjectMember.employee_id == current_user.id
            )
        ),
    )

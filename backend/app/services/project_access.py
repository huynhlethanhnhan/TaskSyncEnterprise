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
    if project.team_id is not None and current_user.team_id == project.team_id:
        return True
    if (
        project.team_id is None
        and project.department_id is not None
        and current_user.department_id == project.department_id
    ):
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

    if current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        return project

    if project.created_by == current_user.id:
        return project

    if project.team_id:
        is_this_team_leader = db.scalar(
            select(Team.id).where(
                Team.id == project.team_id,
                Team.leader_id == current_user.id,
                Team.is_active == True,
            )
        )
        if is_this_team_leader:
            return project

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only an authorized Manager, Creator, or Team Leader of this project can modify it.",
    )


def project_scope_predicate(current_user: Employee):
    if current_user.role_id == ROLE_ADMIN:
        return None
    return or_(
        Project.created_by == current_user.id,
        (
            Project.team_id == current_user.team_id
            if current_user.team_id is not None
            else False
        ),
        (
            (Project.team_id.is_(None))
            & (Project.department_id == current_user.department_id)
            if current_user.department_id is not None
            else False
        ),
        Project.id.in_(
            select(ProjectMember.project_id).where(
                ProjectMember.employee_id == current_user.id
            )
        ),
    )


def validate_project_relationships(
    db: Session,
    *,
    department_id: int | None,
    team_id: int | None,
) -> None:
    from app.models.department import Department
    from app.core.exceptions import BusinessRuleException

    if team_id is not None and department_id is None:
        raise BusinessRuleException(
            message="Project có Team thì phải có Phòng ban.",
            error_code="PROJECT_DEPARTMENT_REQUIRED",
            status_code=409,
        )
    if department_id is not None:
        dept = db.get(Department, department_id)
        if dept is None or not dept.is_active:
            raise BusinessRuleException(
                message="Phòng ban không tồn tại.",
                error_code="DEPARTMENT_NOT_FOUND",
                status_code=404,
            )
    if team_id is not None:
        team = db.get(Team, team_id)
        if team is None or not team.is_active:
            raise BusinessRuleException(
                message="Team không tồn tại hoặc đã bị vô hiệu hóa.",
                error_code="TEAM_NOT_FOUND",
                status_code=404,
            )
        if department_id is not None and team.department_id != department_id:
            raise BusinessRuleException(
                message="Team không thuộc Phòng ban của dự án.",
                error_code="TEAM_DEPARTMENT_MISMATCH",
                status_code=409,
            )

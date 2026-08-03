from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.discussion_topic import DiscussionTopic
from app.models.employee import Employee
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.services.project_access import get_active_project
from app.services.sprint_service import SPRINT_ACTIVE, SPRINT_PLANNED
from app.core.exceptions import BusinessRuleException


def validate_task_relationships(
    db: Session,
    *,
    project_id: int,
    sprint_id: int | None,
    assigned_to: int | None,
    topic_id: int | None,
) -> None:
    get_active_project(db, project_id)

    if sprint_id is not None:
        sprint = db.scalar(
            select(Sprint).where(
                Sprint.id == sprint_id,
                Sprint.is_deleted == False,  # noqa: E712
            )
        )
        if sprint is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sprint does not exist or is deleted.",
            )
        if sprint.project_id != project_id:
            raise BusinessRuleException(
                message="Task and Sprint must belong to the same Project.",
                error_code="SPRINT_MISMATCH",
                status_code=409,
            )
        if sprint.status not in {SPRINT_PLANNED, SPRINT_ACTIVE}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tasks cannot be assigned to a Completed or Cancelled Sprint.",
            )

    if assigned_to is not None:
        employee = db.scalar(
            select(Employee).where(
                Employee.id == assigned_to,
                Employee.is_active == True,  # noqa: E712
                Employee.is_deleted == False,  # noqa: E712
            )
        )
        if employee is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Assignee does not exist or is inactive.",
            )
        membership = db.scalar(
            select(ProjectMember.id).where(
                ProjectMember.project_id == project_id,
                ProjectMember.employee_id == assigned_to,
            )
        )
        if membership is None:
            raise BusinessRuleException(
                message="Nhân viên được chọn chưa phải thành viên của dự án.",
                error_code="ASSIGNEE_NOT_PROJECT_MEMBER",
                status_code=409,
            )

    if topic_id is not None:
        topic = db.scalar(
            select(DiscussionTopic).where(
                DiscussionTopic.id == topic_id,
                DiscussionTopic.is_deleted == False,  # noqa: E712
            )
        )
        if topic is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Topic does not exist or is deleted.",
            )
        if topic.project_id is not None and topic.project_id != project_id:
            raise BusinessRuleException(
                message="Task and Topic must belong to the same Project.",
                error_code="TOPIC_MISMATCH",
                status_code=409,
            )

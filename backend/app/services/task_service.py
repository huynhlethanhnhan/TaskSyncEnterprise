from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.discussion_topic import DiscussionTopic
from app.models.sprint import Sprint
from app.services.project_assignment import validate_project_assignee
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
        validate_project_assignee(db, project_id, assigned_to)

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

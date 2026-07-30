from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.backlog_item import BacklogItem
from app.models.sprint import Sprint
from app.models.task import Task
from app.schemas.sprint import SprintCreate, SprintUpdate
from app.services.project_access import get_active_project

SPRINT_PLANNED = "Planned"
SPRINT_ACTIVE = "Active"
SPRINT_COMPLETED = "Completed"
SPRINT_CANCELLED = "Cancelled"
SPRINT_STATUSES = {
    SPRINT_PLANNED,
    SPRINT_ACTIVE,
    SPRINT_COMPLETED,
    SPRINT_CANCELLED,
}


def validate_sprint_values(
    db: Session,
    *,
    project_id: int,
    start_date: datetime | None,
    end_date: datetime | None,
    sprint_status: str,
) -> None:
    get_active_project(db, project_id)
    if sprint_status not in SPRINT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported Sprint status: {sprint_status}.",
        )
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sprint start date cannot be after its end date.",
        )


def create_sprint(db: Session, data: SprintCreate, *, created_by_id: int) -> Sprint:
    if data.status != SPRINT_PLANNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Sprint must be created in Planned status.",
        )
    validate_sprint_values(
        db,
        project_id=data.project_id,
        start_date=data.start_date,
        end_date=data.end_date,
        sprint_status=data.status,
    )
    sprint = Sprint(**data.model_dump(), created_by_id=created_by_id)
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def update_planned_sprint(
    db: Session,
    sprint: Sprint,
    data: SprintUpdate,
) -> Sprint:
    if sprint.status != SPRINT_PLANNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a Planned Sprint can be edited.",
        )

    values = data.model_dump(exclude_unset=True)
    if "status" in values and values["status"] != sprint.status:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use a Sprint lifecycle action to change its status.",
        )

    validate_sprint_values(
        db,
        project_id=sprint.project_id,
        start_date=values.get("start_date", sprint.start_date),
        end_date=values.get("end_date", sprint.end_date),
        sprint_status=sprint.status,
    )
    for key, value in values.items():
        setattr(sprint, key, value)
    db.commit()
    db.refresh(sprint)
    return sprint


def start_sprint(db: Session, sprint: Sprint) -> Sprint:
    if sprint.status != SPRINT_PLANNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sprint '{sprint.name}' đang ở trạng thái '{sprint.status}'. Chỉ có Sprint ở trạng thái Planned mới có thể kích hoạt.",
        )

    now = datetime.now(UTC).replace(tzinfo=None)
    start_date = sprint.start_date or now
    end_date = sprint.end_date or (start_date + timedelta(days=14))
    validate_sprint_values(
        db,
        project_id=sprint.project_id,
        start_date=start_date,
        end_date=end_date,
        sprint_status=SPRINT_PLANNED,
    )

    active_sprint = db.scalar(
        select(Sprint).where(
            Sprint.project_id == sprint.project_id,
            Sprint.status == SPRINT_ACTIVE,
            Sprint.is_deleted == False,  # noqa: E712
            Sprint.id != sprint.id,
        )
    )
    if active_sprint is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dự án này đang có Sprint '{active_sprint.name}' (ID: {active_sprint.id}) ở trạng thái Active. Vui lòng hoàn thành hoặc đóng Sprint đó trước khi kích hoạt Sprint '{sprint.name}'.",
        )

    backlog_count = (
        db.scalar(
            select(func.count(BacklogItem.id)).where(
                BacklogItem.sprint_id == sprint.id,
                BacklogItem.is_deleted == False,  # noqa: E712
            )
        )
        or 0
    )
    task_count = (
        db.scalar(
            select(func.count(Task.id)).where(
                Task.sprint_id == sprint.id,
                Task.is_deleted == False,  # noqa: E712
            )
        )
        or 0
    )
    # Sprints must have at least one Task or Backlog Item before activation
    if backlog_count == 0 and task_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sprint '{sprint.name}' chưa có Task hoặc Backlog Item nào. Vui lòng bổ sung ít nhất một công việc trước khi kích hoạt.",
        )

    sprint.start_date = start_date
    sprint.end_date = end_date
    sprint.status = SPRINT_ACTIVE
    db.commit()
    db.refresh(sprint)
    return sprint


def complete_sprint(db: Session, sprint: Sprint) -> Sprint:
    if sprint.status != SPRINT_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only an Active Sprint can be completed.",
        )

    incomplete_tasks = db.scalars(
        select(Task).where(
            Task.sprint_id == sprint.id,
            Task.status != "Done",
            Task.is_deleted == False,  # noqa: E712
        )
    ).all()
    incomplete_task_ids = [task.id for task in incomplete_tasks]

    unfinished_items = db.scalars(
        select(BacklogItem).where(
            BacklogItem.sprint_id == sprint.id,
            BacklogItem.is_deleted == False,  # noqa: E712
        )
    ).all()
    for item in unfinished_items:
        if item.task_id is None or item.task_id in incomplete_task_ids:
            item.sprint_id = None
            item.task_id = None
            item.status = "Backlog"

    sprint.status = SPRINT_COMPLETED
    if sprint.end_date is None:
        sprint.end_date = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(sprint)
    return sprint


def cancel_sprint(db: Session, sprint: Sprint) -> Sprint:
    if sprint.status not in {SPRINT_PLANNED, SPRINT_ACTIVE}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a Planned or Active Sprint can be cancelled.",
        )
    sprint.status = SPRINT_CANCELLED
    db.commit()
    db.refresh(sprint)
    return sprint


def reopen_sprint(db: Session, sprint: Sprint) -> Sprint:
    if sprint.status not in {SPRINT_COMPLETED, SPRINT_CANCELLED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a Completed or Cancelled Sprint can be reopened.",
        )

    # Reopening is a corrective planning action. It must not silently create a
    # second Active Sprint for the same Project.
    sprint.status = SPRINT_PLANNED
    db.commit()
    db.refresh(sprint)
    return sprint


def add_backlog_item(
    db: Session,
    sprint: Sprint,
    item: BacklogItem,
) -> BacklogItem:
    validate_add_backlog_item(
        sprint,
        item_project_id=item.project_id,
        current_sprint_id=item.sprint_id,
        item_is_deleted=bool(item.is_deleted),
    )
    item.sprint_id = sprint.id
    item.status = "In Sprint"
    db.commit()
    db.refresh(item)
    return item


def validate_add_backlog_item(
    sprint: Sprint,
    *,
    item_project_id: int,
    current_sprint_id: int | None,
    item_is_deleted: bool = False,
) -> None:
    if sprint.status != SPRINT_PLANNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Items can only be added to a Planned Sprint.",
        )
    if item_project_id != sprint.project_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Item and Sprint must belong to the same Project.",
        )
    if item_is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backlog Item not found.",
        )
    if current_sprint_id is not None and current_sprint_id != sprint.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Item is already assigned to another Sprint.",
        )
    if current_sprint_id == sprint.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Item is already assigned to this Sprint.",
        )


def remove_backlog_item(
    db: Session,
    sprint: Sprint,
    item: BacklogItem,
) -> BacklogItem:
    validate_remove_backlog_item(sprint, item_sprint_id=item.sprint_id)
    item.sprint_id = None
    item.status = "Backlog"
    db.commit()
    db.refresh(item)
    return item


def validate_remove_backlog_item(
    sprint: Sprint,
    *,
    item_sprint_id: int | None,
) -> None:
    if sprint.status != SPRINT_PLANNED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Items can only be removed from a Planned Sprint.",
        )
    if item_sprint_id != sprint.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Backlog Item is not assigned to this Sprint.",
        )


def serialize_sprint_detail(db: Session, sprint: Sprint) -> dict:
    tasks = db.scalars(
        select(Task).where(
            Task.sprint_id == sprint.id,
            Task.is_deleted == False,  # noqa: E712
        )
    ).all()
    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.status == "Done")
    total_story_points = sum(task.story_points or 0 for task in tasks)
    completed_story_points = sum(
        task.story_points or 0 for task in tasks if task.status == "Done"
    )
    return {
        "id": sprint.id,
        "project_id": sprint.project_id,
        "name": sprint.name,
        "goal": sprint.goal,
        "start_date": sprint.start_date,
        "end_date": sprint.end_date,
        "status": sprint.status,
        "capacity": sprint.capacity,
        "created_at": sprint.created_at,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "remaining_tasks": total_tasks - completed_tasks,
        "progress_percent": (
            round(completed_tasks * 100 / total_tasks, 2) if total_tasks else 0
        ),
        "total_story_points": total_story_points,
        "completed_story_points": completed_story_points,
        "remaining_story_points": total_story_points - completed_story_points,
    }


def get_planning_data(db: Session, sprint: Sprint) -> dict:
    eligible_items = db.scalars(
        select(BacklogItem)
        .where(
            BacklogItem.project_id == sprint.project_id,
            BacklogItem.sprint_id.is_(None),
            BacklogItem.is_deleted == False,  # noqa: E712
        )
        .order_by(BacklogItem.id.desc())
    ).all()
    sprint_items = db.scalars(
        select(BacklogItem)
        .where(
            BacklogItem.sprint_id == sprint.id,
            BacklogItem.is_deleted == False,  # noqa: E712
        )
        .order_by(BacklogItem.id.desc())
    ).all()
    return {
        "sprint": sprint,
        "eligible_items": eligible_items,
        "sprint_items": sprint_items,
        "capacity": sprint.capacity,
        "total_story_points": sum(item.story_points or 0 for item in sprint_items),
    }

# 📂 FILE: app/routers/v1/backlog.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.database import get_db
from app.models.employee import Employee
from app.models.backlog_item import BacklogItem
from app.models.project_member import ProjectMember
from app.models.task import Task
from app.models.sprint import Sprint
from app.core.deps import get_current_user, RequireManager, RequireEmployee
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.backlog import (
    BacklogItemCreate,
    BacklogItemUpdate,
    BacklogItemResponse,
)
from app.schemas.task import TaskResponse
from app.cache import CacheInvalidator
from app.services.project_access import (
    require_project_access,
    require_project_management,
)
from app.services import sprint_service

router = APIRouter(prefix="/backlog", tags=["Product Backlog"])


def check_project_membership(db: Session, project_id: int, current_user: Employee):
    require_project_access(db, project_id, current_user)


@router.get("", response_model=list[BacklogItemResponse])
def get_backlog_items(
    project_id: int,
    status: str | None = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_membership(db, project_id, current_user)

    stmt = select(BacklogItem).where(
        BacklogItem.project_id == project_id, BacklogItem.is_deleted == False
    )
    if status:
        stmt = stmt.where(BacklogItem.status == status)

    stmt = stmt.order_by(BacklogItem.id.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=BacklogItemResponse, status_code=201)
def create_backlog_item(
    data: BacklogItemCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_project_management(db, data.project_id, current_user)
    values = data.model_dump()
    sprint_id = values.pop("sprint_id", None)
    target_sprint = None
    if sprint_id is not None:
        target_sprint = db.get(Sprint, sprint_id)
        if target_sprint is None or target_sprint.is_deleted:
            raise HTTPException(status_code=404, detail="Sprint not found")
        sprint_service.validate_add_backlog_item(
            target_sprint,
            item_project_id=data.project_id,
            current_sprint_id=None,
        )
        values["status"] = "In Sprint"
    if values.get("title") is None or not str(values["title"]).strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title is required.",
        )
    if values.get("priority") is None:
        values["priority"] = "Medium"
    item = BacklogItem(
        **values,
        sprint_id=sprint_id,
        created_by_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_backlog(
        project_id=data.project_id,
        sprint_id=item.sprint_id,
    )
    return item


@router.get("/{item_id:int}", response_model=BacklogItemResponse)
def get_backlog_item(
    item_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(BacklogItem, item_id)
    if not item or item.is_deleted:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    check_project_membership(db, item.project_id, current_user)
    return item


@router.put("/{item_id:int}", response_model=BacklogItemResponse)
def update_backlog_item(
    item_id: int,
    data: BacklogItemUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(BacklogItem, item_id)
    if not item or item.is_deleted:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    require_project_management(db, item.project_id, current_user)

    values = data.model_dump(exclude_unset=True)
    if values.get("title") is not None and not str(values["title"]).strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Title must not be empty.",
        )
    sprint_id_was_set = "sprint_id" in values
    target_sprint_id = values.pop("sprint_id", item.sprint_id)
    if sprint_id_was_set and target_sprint_id != item.sprint_id:
        if target_sprint_id is None:
            current_sprint = db.get(Sprint, item.sprint_id)
            if current_sprint is None:
                raise HTTPException(status_code=404, detail="Sprint not found")
            sprint_service.validate_remove_backlog_item(
                current_sprint,
                item_sprint_id=item.sprint_id,
            )
            values["status"] = "Backlog"
        else:
            target_sprint = db.get(Sprint, target_sprint_id)
            if target_sprint is None or target_sprint.is_deleted:
                raise HTTPException(status_code=404, detail="Sprint not found")
            sprint_service.validate_add_backlog_item(
                target_sprint,
                item_project_id=item.project_id,
                current_sprint_id=item.sprint_id,
                item_is_deleted=bool(item.is_deleted),
            )
            values["status"] = "In Sprint"
        values["sprint_id"] = target_sprint_id
    for k, v in values.items():
        setattr(item, k, v)

    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_backlog(
        project_id=item.project_id,
        sprint_id=item.sprint_id,
    )
    return item


@router.delete("/{item_id:int}")
def delete_backlog_item(
    item_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(BacklogItem, item_id)
    if not item or item.is_deleted:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    require_project_management(db, item.project_id, current_user)

    item.is_deleted = True
    db.commit()

    CacheInvalidator.invalidate_backlog(
        project_id=item.project_id,
        sprint_id=item.sprint_id,
    )
    return {"success": True, "message": "Backlog item deleted"}


@router.post("/{item_id:int}/convert-to-task", response_model=TaskResponse)
def convert_to_task(
    item_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(BacklogItem, item_id)
    if not item or item.is_deleted:
        raise HTTPException(status_code=404, detail="Backlog item not found")

    require_project_management(db, item.project_id, current_user)

    # If it is already converted, don't re-convert
    if item.task_id:
        existing_task = db.get(Task, item.task_id)
        if existing_task and not existing_task.is_deleted:
            return existing_task

    # Create new task
    task = Task(
        project_id=item.project_id,
        sprint_id=item.sprint_id,
        topic_id=item.topic_id,
        title=item.title,
        description=item.description,
        priority=item.priority,
        status="To Do",
        story_points=item.story_points,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Link backlog item to the task and change status
    item.task_id = task.id
    item.status = "In Sprint" if item.sprint_id else "Backlog"
    db.commit()

    CacheInvalidator.invalidate_task(task.id, project_id=task.project_id)
    if task.sprint_id is not None:
        CacheInvalidator.invalidate_sprint(
            task.sprint_id,
            project_id=task.project_id,
        )
    return task

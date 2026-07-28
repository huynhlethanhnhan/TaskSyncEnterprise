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
from app.schemas.backlog import BacklogItemCreate, BacklogItemUpdate, BacklogItemResponse
from app.schemas.task import TaskResponse
from app.cache import CacheInvalidator

router = APIRouter(prefix="/backlog", tags=["Product Backlog"])


def check_project_membership(db: Session, project_id: int, current_user: Employee):
    if current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        return
    is_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == current_user.id
        )
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project's backlog")


@router.get("", response_model=list[BacklogItemResponse])
def get_backlog_items(
    project_id: int,
    status: str | None = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_membership(db, project_id, current_user)
    
    stmt = select(BacklogItem).where(
        BacklogItem.project_id == project_id,
        BacklogItem.is_deleted == False
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
    # Let managers and admins do CRUD, or allow employees who are project members
    check_project_membership(db, data.project_id, current_user)
    
    # Restrict write to Manager/Admin
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can modify the Product Backlog")

    item = BacklogItem(
        **data.model_dump(),
        created_by_id=current_user.id
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_project(data.project_id)
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

    check_project_membership(db, item.project_id, current_user)
    
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can modify the Product Backlog")

    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(item, k, v)

    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_project(item.project_id)
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

    check_project_membership(db, item.project_id, current_user)
    
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can delete from the Product Backlog")

    item.is_deleted = True
    db.commit()

    CacheInvalidator.invalidate_project(item.project_id)
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

    check_project_membership(db, item.project_id, current_user)
    
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can convert backlog items to tasks")

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
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Link backlog item to the task and change status
    item.task_id = task.id
    item.status = "In Sprint" if item.sprint_id else "Backlog"
    db.commit()

    CacheInvalidator.invalidate_task(task.id, project_id=task.project_id)
    return task

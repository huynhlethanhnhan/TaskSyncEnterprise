# 📂 FILE: app/routers/v1/checklists.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.employee import Employee
from app.models.task import Task
from app.models.task_checklist import TaskChecklist
from app.core.deps import get_current_user, RequireEmployee
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.checklist import (
    TaskChecklistCreate,
    TaskChecklistUpdate,
    TaskChecklistResponse,
)
from app.cache import CacheInvalidator

router = APIRouter(prefix="/tasks/{task_id}/checklist", tags=["Checklists"])


def get_task_with_access(
    db: Session, task_id: int, current_user: Employee, read_only: bool = True
) -> Task:
    task = db.get(Task, task_id)
    if not task or task.is_deleted:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        return task

    # Check assignment
    from app.models.task_assignment import TaskAssignment

    is_assigned = db.scalar(
        select(TaskAssignment).where(
            TaskAssignment.task_id == task_id,
            TaskAssignment.employee_id == current_user.id,
        )
    )
    if is_assigned:
        return task

    # Check creator
    if task.created_by == current_user.id:
        return task

    # Check project membership
    from app.models.project_member import ProjectMember

    is_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == task.project_id,
            ProjectMember.employee_id == current_user.id,
        )
    )
    if is_member:
        if not read_only:
            raise HTTPException(
                status_code=403, detail="You do not have write access to this task"
            )
        return task

    raise HTTPException(status_code=403, detail="Access denied to this task")


@router.get("", response_model=list[TaskChecklistResponse])
def get_checklist(
    task_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_task_with_access(db, task_id, current_user, read_only=True)
    stmt = select(TaskChecklist).where(TaskChecklist.task_id == task_id)
    return db.scalars(stmt).all()


@router.post("", response_model=TaskChecklistResponse, status_code=201)
def create_checklist_item(
    task_id: int,
    data: TaskChecklistCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user, read_only=False)

    item = TaskChecklist(task_id=task_id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_task(
        task_id, project_id=task.project_id, employee_id=task.employee_id
    )
    return item


@router.patch("/{item_id}", response_model=TaskChecklistResponse)
def update_checklist_item(
    task_id: int,
    item_id: int,
    data: TaskChecklistUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user, read_only=False)
    item = db.get(TaskChecklist, item_id)
    if not item or item.task_id != task_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(item, k, v)

    db.commit()
    db.refresh(item)

    CacheInvalidator.invalidate_task(
        task_id, project_id=task.project_id, employee_id=task.employee_id
    )
    return item


@router.delete("/{item_id}")
def delete_checklist_item(
    task_id: int,
    item_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user, read_only=False)
    item = db.get(TaskChecklist, item_id)
    if not item or item.task_id != task_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    db.delete(item)
    db.commit()

    CacheInvalidator.invalidate_task(
        task_id, project_id=task.project_id, employee_id=task.employee_id
    )
    return {"success": True, "message": "Checklist item deleted"}

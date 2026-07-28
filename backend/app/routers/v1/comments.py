# 📂 FILE: app/routers/v1/comments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.models.employee import Employee
from app.models.task import Task
from app.models.task_comment import TaskComment
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.comment import TaskCommentCreate, TaskCommentUpdate, TaskCommentResponse
from app.cache import CacheInvalidator

router = APIRouter(prefix="/tasks/{task_id}/comments", tags=["Task Comments"])


def get_task_with_access(db: Session, task_id: int, current_user: Employee) -> Task:
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
            TaskAssignment.employee_id == current_user.id
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
            ProjectMember.employee_id == current_user.id
        )
    )
    if is_member:
        return task

    raise HTTPException(status_code=403, detail="Access denied to this task")


@router.get("", response_model=list[TaskCommentResponse])
def get_comments(
    task_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_task_with_access(db, task_id, current_user)
    stmt = select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc())
    return db.scalars(stmt).all()


@router.post("", response_model=TaskCommentResponse, status_code=201)
def create_comment(
    task_id: int,
    data: TaskCommentCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user)
    
    comment = TaskComment(
        task_id=task_id,
        employee_id=current_user.id,
        content=data.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Invalidate caching
    CacheInvalidator.invalidate_task(task_id, project_id=task.project_id, employee_id=task.employee_id)
    return comment


@router.patch("/{comment_id}", response_model=TaskCommentResponse)
def update_comment(
    task_id: int,
    comment_id: int,
    data: TaskCommentUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user)
    comment = db.get(TaskComment, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    comment.content = data.content
    db.commit()
    db.refresh(comment)

    CacheInvalidator.invalidate_task(task_id, project_id=task.project_id, employee_id=task.employee_id)
    return comment


@router.delete("/{comment_id}")
def delete_comment(
    task_id: int,
    comment_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_task_with_access(db, task_id, current_user)
    comment = db.get(TaskComment, comment_id)
    if not comment or comment.task_id != task_id:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only author or Admin/Manager can delete
    is_moderator = current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER)
    if comment.employee_id != current_user.id and not is_moderator:
        raise HTTPException(status_code=403, detail="You are not authorized to delete this comment")

    db.delete(comment)
    db.commit()

    CacheInvalidator.invalidate_task(task_id, project_id=task.project_id, employee_id=task.employee_id)
    return {"success": True, "message": "Comment deleted"}

# 📂 FILE: app/routers/v1/files.py
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.database import get_db
from app.models.employee import Employee
from app.models.task_attachment import TaskAttachment
from app.models.task import Task
from app.models.discussion_topic import DiscussionTopic
from app.models.discussion_reply import DiscussionReply
from app.models.user_feedback import UserFeedback
from app.models.project_member import ProjectMember
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.config import settings
from app.cache import CacheInvalidator

router = APIRouter(prefix="/files", tags=["Files Module"])


class FileRegistryResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    uploaded_by_id: int
    uploader_name: str | None = None
    parent_module: str
    parent_entity_id: int
    project_id: int | None = None


def check_file_access(
    db: Session, attachment: TaskAttachment, current_user: Employee
) -> bool:
    if current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        return True

    # If uploader, always allow
    if attachment.uploaded_by_id == current_user.id:
        return True

    # Check project membership based on parent module
    project_id = None
    if attachment.task_id:
        task = db.get(Task, attachment.task_id)
        if task:
            project_id = task.project_id
    elif attachment.topic_id:
        topic = db.get(DiscussionTopic, attachment.topic_id)
        if topic:
            project_id = topic.project_id
    elif attachment.reply_id:
        reply = db.get(DiscussionReply, attachment.reply_id)
        if reply:
            topic = db.get(DiscussionTopic, reply.topic_id)
            if topic:
                project_id = topic.project_id

    if project_id:
        # Check if project member
        is_member = db.scalar(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.employee_id == current_user.id,
            )
        )
        if is_member:
            return True

    # Feedback access check
    if attachment.feedback_id:
        feedback = db.get(UserFeedback, attachment.feedback_id)
        if feedback and feedback.submitter_id == current_user.id:
            return True

    return False


@router.get("", response_model=list[FileRegistryResponse])
def list_files(
    project_id: int | None = None,
    module: str | None = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(TaskAttachment)
    attachments = db.scalars(stmt).all()

    results = []
    for att in attachments:
        # Determine parent module and entity id
        parent_module = "task"
        parent_entity_id = att.task_id or 0
        proj_id = None
        uploader_name = None

        # Fetch uploader name
        uploader = db.get(Employee, att.uploaded_by_id)
        if uploader:
            uploader_name = uploader.full_name

        if att.task_id:
            task = db.get(Task, att.task_id)
            if task:
                proj_id = task.project_id
        elif att.topic_id:
            parent_module = "topic"
            parent_entity_id = att.topic_id
            topic = db.get(DiscussionTopic, att.topic_id)
            if topic:
                proj_id = topic.project_id
        elif att.reply_id:
            parent_module = "reply"
            parent_entity_id = att.reply_id
            reply = db.get(DiscussionReply, att.reply_id)
            if reply:
                topic = db.get(DiscussionTopic, reply.topic_id)
                if topic:
                    proj_id = topic.project_id
        elif att.feedback_id:
            parent_module = "feedback"
            parent_entity_id = att.feedback_id
            # Feedback has no project_id

        # Skip if user doesn't have access
        if not check_file_access(db, att, current_user):
            continue

        # Filters
        if project_id and proj_id != project_id:
            continue
        if module and parent_module != module:
            continue

        results.append(
            FileRegistryResponse(
                id=att.id,
                file_name=att.file_name,
                file_path=att.file_path,
                file_size=att.file_size,
                mime_type=att.mime_type,
                uploaded_at=att.uploaded_at,
                uploaded_by_id=att.uploaded_by_id,
                uploader_name=uploader_name,
                parent_module=parent_module,
                parent_entity_id=parent_entity_id,
                project_id=proj_id,
            )
        )

    return results


@router.get("/download/{file_id:int}")
def download_file(
    file_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    att = db.get(TaskAttachment, file_id)
    if not att:
        raise HTTPException(status_code=404, detail="File not found")

    if not check_file_access(db, att, current_user):
        raise HTTPException(status_code=403, detail="Unauthorized access to this file")

    local_path = att.file_path.lstrip("/")
    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="File physical storage not found")

    # Prevent path traversal
    abs_path = os.path.abspath(local_path)
    abs_upload = os.path.abspath(settings.STORAGE_UPLOAD_DIR)
    if not abs_path.startswith(abs_upload):
        raise HTTPException(status_code=400, detail="Path traversal attempt detected")

    return FileResponse(path=abs_path, filename=att.file_name, media_type=att.mime_type)


@router.delete("/{file_id:int}")
def delete_file(
    file_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    att = db.get(TaskAttachment, file_id)
    if not att:
        raise HTTPException(status_code=404, detail="File not found")

    # Author or Admin/Manager can delete
    is_moderator = current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER)
    if att.uploaded_by_id != current_user.id and not is_moderator:
        raise HTTPException(
            status_code=403, detail="You do not have permission to delete this file"
        )

    local_path = att.file_path.lstrip("/")
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception:
            pass

    # Invalidate caching if task-related
    if att.task_id:
        task = db.get(Task, att.task_id)
        if task:
            CacheInvalidator.invalidate_task(
                task.id, project_id=task.project_id, employee_id=task.employee_id
            )

    db.delete(att)
    db.commit()
    CacheInvalidator.invalidate_file(file_id)
    return {"success": True, "message": "File deleted successfully"}


from fastapi import UploadFile, File, Form
from app.services.storage_service import StorageService


@router.post("/upload", summary="Generic upload attachment endpoint for any module")
def upload_file(
    file: UploadFile = File(...),
    task_id: int | None = Form(None),
    topic_id: int | None = Form(None),
    reply_id: int | None = Form(None),
    feedback_id: int | None = Form(None),
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_metadata = StorageService.save_attachment(file)

    db_attachment = TaskAttachment(
        task_id=task_id,
        topic_id=topic_id,
        reply_id=reply_id,
        feedback_id=feedback_id,
        file_name=file_metadata["file_name"],
        file_path=file_metadata["file_path"],
        file_size=file_metadata["file_size"],
        mime_type=file_metadata["mime_type"],
        uploaded_by_id=current_user.id,
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)

    if task_id:
        task = db.get(Task, task_id)
        if task:
            CacheInvalidator.invalidate_task(
                task.id, project_id=task.project_id, employee_id=task.employee_id
            )
    CacheInvalidator.invalidate_file(db_attachment.id)

    return {
        "success": True,
        "message": "Tải tài liệu lên thành công!",
        "data": {
            "id": db_attachment.id,
            "file_name": db_attachment.file_name,
            "file_path": db_attachment.file_path,
            "file_size": db_attachment.file_size,
            "mime_type": db_attachment.mime_type,
            "uploaded_by_id": db_attachment.uploaded_by_id,
        },
    }

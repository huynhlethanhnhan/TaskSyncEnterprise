# 📂 FILE: app/schemas/comment.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CommentAuthor(BaseModel):
    id: int
    full_name: str
    avatar_url: str | None = None
    job_title: str | None = None
    role_id: int

    model_config = ConfigDict(from_attributes=True)


class TaskCommentBase(BaseModel):
    content: str


class TaskCommentCreate(TaskCommentBase):
    pass


class TaskCommentUpdate(TaskCommentBase):
    pass


class TaskCommentResponse(TaskCommentBase):
    id: int
    task_id: int
    employee_id: int
    created_at: datetime
    author: CommentAuthor | None = None

    model_config = ConfigDict(from_attributes=True)

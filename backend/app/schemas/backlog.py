# 📂 FILE: app/schemas/backlog.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class BacklogItemBase(BaseModel):
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "Backlog"
    story_points: int = Field(default=0, ge=0)
    sprint_id: int | None = None
    topic_id: int | None = None


class BacklogItemCreate(BacklogItemBase):
    project_id: int


class BacklogItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    story_points: int | None = Field(default=None, ge=0)
    sprint_id: int | None = None
    topic_id: int | None = None
    task_id: int | None = None


class BacklogItemResponse(BacklogItemBase):
    id: int
    project_id: int
    task_id: int | None = None
    created_by_id: int | None = None
    created_at: datetime
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

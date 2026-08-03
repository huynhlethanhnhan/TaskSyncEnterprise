# 📂 FILE: app/schemas/backlog.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class BacklogItemBase(BaseModel):
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "Backlog"
    story_points: int = Field(default=0, ge=0)
    sprint_id: int | None = None
    topic_id: int | None = None

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value

    @field_validator("priority", mode="before")
    @classmethod
    def normalize_priority(cls, value):
        if value is None:
            return "Medium"
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or "Medium"
        return value

    @field_validator("story_points", mode="before")
    @classmethod
    def normalize_story_points(cls, value):
        if value in (None, "", " "):
            return 0
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return 0
            return int(stripped)
        return value

    @field_validator("sprint_id", "topic_id", mode="before")
    @classmethod
    def normalize_optional_ids(cls, value):
        if value in (None, "", " ", 0):
            return None
        return value


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

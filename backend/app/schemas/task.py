# 📂 FILE: app/schemas/task.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskCreate(BaseModel):
    project_id: int
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "To Do"
    story_points: int = Field(default=0, ge=0)
    deadline: datetime | None = None
    created_by: int | None = None
    assigned_to: int | None = None
    sprint_id: int | None = None
    topic_id: int | None = None

    @field_validator("sprint_id", "topic_id", "assigned_to", "project_id", mode="before", check_fields=False)
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    story_points: int | None = Field(default=None, ge=0)
    deadline: datetime | None = None
    assigned_to: int | None = None
    sprint_id: int | None = None
    topic_id: int | None = None

    @field_validator("sprint_id", "topic_id", "assigned_to", "project_id", mode="before", check_fields=False)
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ["To Do", "In Progress", "Done"]:
            raise ValueError("Status must be 'To Do', 'In Progress', or 'Done'")
        return v


class TaskAttachmentResponse(BaseModel):
    id: int
    task_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    uploaded_by_id: int

    model_config = ConfigDict(from_attributes=True)


class AssigneeSummaryResponse(BaseModel):
    id: int
    full_name: str
    avatar_url: str | None = None
    job_title: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TaskResponse(TaskCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    progress_percent: float
    created_at: datetime
    attachments: list[TaskAttachmentResponse] = []
    assignee: AssigneeSummaryResponse | None = None

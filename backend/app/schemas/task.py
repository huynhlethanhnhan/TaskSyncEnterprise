# 📂 FILE: app/schemas/task.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_STORY_POINTS = {1, 2, 3, 5, 8, 13}


class TaskCreate(BaseModel):
    project_id: int
    title: str = ""
    name: str | None = None
    description: str | None = None
    priority: str = "Medium"
    status: str = "To Do"
    story_points: int | None = None
    deadline: datetime | None = None
    created_by: int | None = None
    assigned_to: int | None = None
    sprint_id: int | None = None
    topic_id: int | None = None

    @model_validator(mode="before")
    @classmethod
    def resolve_title(cls, data):
        if isinstance(data, dict):
            if not data.get("title") and data.get("name"):
                data["title"] = data["name"]
        return data

    @field_validator(
        "sprint_id", "topic_id", "assigned_to", mode="before", check_fields=False
    )
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v

    @field_validator("story_points", mode="before")
    @classmethod
    def normalize_unestimated_story_points(cls, v):
        if v in (None, "", 0, "0"):
            return None
        return v

    @field_validator("story_points")
    @classmethod
    def validate_story_points(cls, v: int | None) -> int | None:
        if v is not None and v not in VALID_STORY_POINTS:
            raise ValueError("Story points must be one of 1, 2, 3, 5, 8, or 13")
        return v


class TaskUpdate(BaseModel):
    project_id: int | None = None
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    progress_percent: float | None = Field(default=None, ge=0, le=100)
    story_points: int | None = None
    deadline: datetime | None = None
    assigned_to: int | None = None
    sprint_id: int | None = None
    topic_id: int | None = None

    @field_validator(
        "project_id",
        "sprint_id",
        "topic_id",
        "assigned_to",
        mode="before",
        check_fields=False,
    )
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v

    @field_validator("story_points", mode="before")
    @classmethod
    def normalize_unestimated_story_points(cls, v):
        if v in (None, "", 0, "0"):
            return None
        return v

    @field_validator("story_points")
    @classmethod
    def validate_story_points(cls, v: int | None) -> int | None:
        if v is not None and v not in VALID_STORY_POINTS:
            raise ValueError("Story points must be one of 1, 2, 3, 5, 8, or 13")
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
    creator_name: str | None = None
    attachments: list[TaskAttachmentResponse] = []
    assignee: AssigneeSummaryResponse | None = None

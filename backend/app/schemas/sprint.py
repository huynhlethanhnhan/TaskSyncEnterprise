# 📂 FILE: app/schemas/sprint.py
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.backlog import BacklogItemResponse


class SprintBase(BaseModel):
    name: str
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str = "Planned"
    capacity: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.start_date > self.end_date
        ):
            raise ValueError("Sprint start date cannot be after its end date")
        return self


class SprintCreate(SprintBase):
    project_id: int


class SprintUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = None
    capacity: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_dates(self):
        if (
            self.start_date is not None
            and self.end_date is not None
            and self.start_date > self.end_date
        ):
            raise ValueError("Sprint start date cannot be after its end date")
        return self


class SprintResponse(SprintBase):
    id: int
    project_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SprintDetailResponse(SprintResponse):
    total_tasks: int = 0
    completed_tasks: int = 0
    remaining_tasks: int = 0
    progress_percent: float = 0
    total_story_points: int = 0
    completed_story_points: int = 0
    remaining_story_points: int = 0


class SprintPlanningResponse(BaseModel):
    sprint: SprintResponse
    eligible_items: list[BacklogItemResponse]
    sprint_items: list[BacklogItemResponse]
    capacity: int
    total_story_points: int


class SprintSnapshotResponse(BaseModel):
    snapshot_date: date
    remaining_story_points: int
    completed_story_points: int
    remaining_tasks: int
    completed_tasks: int

    model_config = ConfigDict(from_attributes=True)


class SprintAnalyticsResponse(BaseModel):
    sprint_id: int
    name: str
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str
    capacity: int
    total_tasks: int
    completed_tasks: int
    total_story_points: int
    completed_story_points: int
    snapshots: list[SprintSnapshotResponse]


class VelocityResponse(BaseModel):
    sprint_id: int
    name: str
    completed_story_points: int

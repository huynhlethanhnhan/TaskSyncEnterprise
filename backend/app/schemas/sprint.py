# 📂 FILE: app/schemas/sprint.py
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class SprintBase(BaseModel):
    name: str
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str = "Planned"
    capacity: int = 0


class SprintCreate(SprintBase):
    project_id: int


class SprintUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = None
    capacity: int | None = None


class SprintResponse(SprintBase):
    id: int
    project_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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

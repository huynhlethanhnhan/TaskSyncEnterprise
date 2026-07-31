from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):

    project_code: str
    name: str
    description: str | None = None

    start_date: date | None = None
    end_date: date | None = None

    status: str = "Planning"
    priority: str = "Medium"

    budget: float | None = None


class ProjectCreate(ProjectBase):
    created_by: int | None = None


class ProjectUpdate(BaseModel):

    name: str | None = None
    description: str | None = None

    start_date: date | None = None
    end_date: date | None = None

    status: str | None = None
    priority: str | None = None

    budget: float | None = None
    progress_percent: float | None = None


class ProjectResponse(ProjectBase):

    model_config = ConfigDict(from_attributes=True)

    id: int
    progress_percent: float
    created_at: datetime


class ProjectMemberSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str | None = None
    full_name: str
    avatar_url: str | None = None
    job_title: str | None = None
    position: str | None = None
    email: str | None = None
    is_active: bool = True


class ProjectMemberAddRequest(BaseModel):
    employee_id: int


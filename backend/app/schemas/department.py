from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    department_code: str
    name: str
    description: str | None = None
    manager_id: int | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    department_code: str | None = None
    name: str | None = None
    description: str | None = None
    manager_id: int | None = None


class DepartmentMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    full_name: str
    email: str
    job_title: str | None = None
    avatar_url: str | None = None
    team_id: int | None = None
    role_id: int
    is_active: bool


class DepartmentTeamResponse(BaseModel):
    id: int
    team_code: str
    name: str
    leader_id: int | None = None
    leader_name: str | None = None
    member_count: int = 0


class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manager_name: str | None = None
    manager_avatar_url: str | None = None
    employee_count: int = 0
    team_count: int = 0
    project_count: int = 0
    completed_project_count: int = 0
    sprint_count: int = 0
    is_active: bool
    created_at: datetime


class DepartmentDetailResponse(DepartmentResponse):
    members: list[DepartmentMemberResponse] = Field(default_factory=list)
    teams: list[DepartmentTeamResponse] = Field(default_factory=list)

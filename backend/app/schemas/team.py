from datetime import datetime
from pydantic import BaseModel, ConfigDict
from pydantic import Field


class TeamBase(BaseModel):
    department_id: int
    team_code: str
    name: str
    description: str | None = None
    leader_id: int | None = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    department_id: int | None = None
    team_code: str | None = None
    name: str | None = None
    description: str | None = None
    leader_id: int | None = None


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime

    leader_name: str | None = None
    leader_avatar_url: str | None = None
    member_count: int = 0

    department_name: str | None = None


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    full_name: str
    email: str
    job_title: str | None = None
    avatar_url: str | None = None
    role_id: int
    is_active: bool


class TeamDetailResponse(TeamResponse):
    leader_name: str | None = None
    leader_avatar_url: str | None = None
    member_count: int = 0
    members: list[TeamMemberResponse] = Field(default_factory=list)

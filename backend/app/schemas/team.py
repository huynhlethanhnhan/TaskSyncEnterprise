from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class TeamBase(BaseModel):
    department_id: int
    team_code: str
    name: str
    description: str | None = None
    leader_id: int | None = None

    @field_validator("leader_id", "department_id", mode="before", check_fields=False)
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    department_id: int | None = None
    team_code: str | None = None
    name: str | None = None
    description: str | None = None
    leader_id: int | None = None

    @field_validator("leader_id", "department_id", mode="before", check_fields=False)
    @classmethod
    def empty_to_none(cls, v):
        if v == "" or v == 0:
            return None
        return v


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

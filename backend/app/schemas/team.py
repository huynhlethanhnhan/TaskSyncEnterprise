from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TeamBase(BaseModel):
    department_id: int
    team_code: str
    name: str
    description: str | None = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    department_id: int | None = None
    team_code: str | None = None
    name: str | None = None
    description: str | None = None


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime

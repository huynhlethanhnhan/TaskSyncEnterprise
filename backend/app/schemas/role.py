from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RoleBase(BaseModel):
    role_name: str
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    role_name: str | None = None
    description: str | None = None


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_system: bool
    created_at: datetime

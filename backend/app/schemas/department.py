from datetime import datetime
from pydantic import BaseModel, ConfigDict


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


class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


# 📂 FILE: app/schemas/vacation.py
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class VacationBase(BaseModel):
    type: str
    start_date: date
    end_date: date
    reason: str | None = None
    status: str | None = "Pending"


class VacationCreate(VacationBase):
    pass


class VacationResponse(VacationBase):
    id: int
    requested_by: int
    requested_by_name: str | None = None
    requested_by_email: str | None = None
    approved_by: int | None = None
    approved_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VacationUpdate(BaseModel):
    status: str

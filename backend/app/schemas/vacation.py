# 📂 FILE: app/schemas/vacation.py
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class VacationBase(BaseModel):
    type: str
    start_date: date
    end_date: date
    reason: str | None = None
    status: str | None = "Pending"


class VacationCreate(VacationBase):
    @field_validator("status")
    @classmethod
    def force_initial_pending_status(cls, value: str | None) -> str:
        if value not in (None, "Pending"):
            raise ValueError("New vacation requests must start in Pending status")
        return "Pending"


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

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {
            "Manager Approved",
            "HR Approved",
            "Info Requested",
            "Rejected",
            "Withdrawn",
            "Cancelled",
        }
        if value not in allowed:
            raise ValueError(f"Unsupported vacation status: {value}")
        return value

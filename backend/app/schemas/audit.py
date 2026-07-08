from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: int
    employee_id: int | None = None
    employee_email: str | None = None
    action: str | None = None
    timestamp: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

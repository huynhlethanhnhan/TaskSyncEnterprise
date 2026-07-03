# 📂 FILE: app/schemas/notification.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class NotificationBase(BaseModel):
    title: str
    message: str
    is_read: bool = False

class NotificationCreate(NotificationBase):
    employee_id: int

class NotificationResponse(NotificationBase):
    id: int
    employee_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

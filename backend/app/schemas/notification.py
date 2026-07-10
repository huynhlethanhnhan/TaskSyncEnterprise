# 📂 FILE: app/schemas/notification.py
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CreateNotificationRequest(BaseModel):
    """Schema to request creation of a new in-app notification."""
    employee_id: int = Field(..., description="ID of employee to receive notification")
    title: str = Field(..., max_length=200, description="Brief subject of the notification")
    message: str = Field(..., max_length=1000, description="Detailed body of the notification")


class NotificationResponse(BaseModel):
    """Schema representing an in-app notification detail."""
    id: int
    employee_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationSummaryResponse(BaseModel):
    """Schema representing summary count overview of notifications."""
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Schema representing count of unread notifications."""
    unread_count: int
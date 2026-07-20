# 📂 FILE: app/schemas/notification.py
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.core.enums import (
    NotificationType,
    NotificationPriority,
    NotificationStatus,
    NotificationChannel,
)


class NotificationCreateRequest(BaseModel):
    """Schema to request creation of a new notification."""

    employee_id: int = Field(..., description="ID of employee to receive notification")
    type: NotificationType = Field(..., description="Type/category of notification")
    title: str = Field(
        ..., max_length=200, description="Brief subject of the notification"
    )
    message: str = Field(
        ..., max_length=1000, description="Detailed body of the notification"
    )
    priority: NotificationPriority = Field(
        default=NotificationPriority.NORMAL, description="Priority level"
    )
    status: NotificationStatus = Field(
        default=NotificationStatus.PENDING, description="Initial delivery status"
    )
    channel: NotificationChannel = Field(
        default=NotificationChannel.IN_APP, description="Initial delivery channel"
    )
    event_id: Optional[str] = Field(
        None, max_length=50, description="Correlation UUID event ID"
    )
    context_json: Optional[str] = Field(
        None, description="Serialized JSON context payload metadata"
    )


# Alias for CreateRequest as requested
CreateRequest = NotificationCreateRequest


# Backwards compatibility alias for CreateNotificationRequest
class CreateNotificationRequest(BaseModel):
    """Old Schema to request creation of a new in-app notification."""

    employee_id: int = Field(..., description="ID of employee to receive notification")
    title: str = Field(
        ..., max_length=200, description="Brief subject of the notification"
    )
    message: str = Field(
        ..., max_length=1000, description="Detailed body of the notification"
    )


class NotificationUpdateRequest(BaseModel):
    """Schema to update an existing notification."""

    status: Optional[NotificationStatus] = Field(
        None, description="Delivery status of the notification"
    )
    is_read: Optional[bool] = Field(None, description="Mark as read status")
    read_at: Optional[datetime] = Field(
        None, description="Timestamp when notification was read"
    )


# Alias for UpdateRequest as requested
UpdateRequest = NotificationUpdateRequest


class NotificationResponse(BaseModel):
    """Schema representing a notification detail."""

    id: int
    employee_id: int
    type: str
    title: str
    message: str
    priority: str
    status: str
    channel: str
    event_id: Optional[str] = None
    context_json: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Alias for Response as requested
Response = NotificationResponse


class NotificationPreferenceResponse(BaseModel):
    """Schema representing user notification preferences settings."""

    employee_id: int
    notification_type: str
    channel: str
    enabled: bool

    model_config = ConfigDict(from_attributes=True)


# Alias for PreferenceResponse as requested
PreferenceResponse = NotificationPreferenceResponse


class NotificationLogResponse(BaseModel):
    """Schema representing a delivery log of a notification."""

    id: int
    notification_id: int
    channel: str
    delivery_status: str
    retry_count: int
    provider_response: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Alias for LogResponse as requested
LogResponse = NotificationLogResponse


class NotificationSummaryResponse(BaseModel):
    """Schema representing summary count overview of notifications."""

    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Schema representing count of unread notifications."""

    unread_count: int


class UpdatePreferencesRequest(BaseModel):
    """Schema to update a user notification preference."""

    notification_type: str = Field(
        ..., description="Notification type category (e.g. TASKS, VACATION)"
    )
    channel: str = Field(
        ..., description="Target delivery channel (e.g. EMAIL, IN_APP)"
    )
    enabled: bool = Field(..., description="Enable or disable delivery")

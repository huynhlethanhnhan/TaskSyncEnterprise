# 📂 FILE: app/services/notification/events.py
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from app.core.enums import NotificationType, NotificationPriority


class NotificationEvent(BaseModel):
    """Data Transfer Object representing a system notification event."""
    event_id: str = Field(..., description="Unique UUID identification of the event occurrence")
    event_type: NotificationType = Field(..., description="Category of system event triggering notification")
    actor_id: Optional[int] = Field(None, description="Employee ID of the individual triggering the event")
    recipient_ids: List[int] = Field(..., min_length=1, description="List of target employee IDs to notify")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Contextual dynamic key-value pairs")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="Notification priority level")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), description="UTC event execution time")

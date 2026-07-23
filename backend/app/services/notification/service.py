# 📂 FILE: app/services/notification/service.py
import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.services.background_job_service import BackgroundJobService
from app.services.notification.events import NotificationEvent
from app.services.notification.dispatcher import NotificationDispatcher
from app.core.enums import NotificationType, NotificationPriority


def async_dispatch_notification_task(event_dict: dict) -> None:
    """Entry point task executed by the background worker thread pool."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        event = NotificationEvent(**event_dict)
        dispatcher = NotificationDispatcher()
        dispatcher.dispatch(db, event)
    finally:
        db.close()


class NotificationService:
    """Core Notification Engine Service layer orchestrator."""

    def __init__(self) -> None:
        self.dispatcher = NotificationDispatcher()

    def trigger_event(self, db: Session, event: NotificationEvent) -> None:
        """Synchronously routes and dispatches a notification event."""
        self.dispatcher.dispatch(db, event)

    def trigger_event_async(
        self, bg_service: BackgroundJobService, event: NotificationEvent
    ) -> None:
        """Asynchronously schedules the notification event execution on the BackgroundJobService."""
        bg_service.enqueue(async_dispatch_notification_task, event.model_dump())

    def create_event(
        self,
        event_type: NotificationType,
        recipient_ids: List[int],
        payload: Dict[str, Any],
        actor_id: int | None = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
    ) -> NotificationEvent:
        """Helper function to create a validated NotificationEvent instance."""
        return NotificationEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            actor_id=actor_id,
            recipient_ids=recipient_ids,
            payload=payload,
            priority=priority,
        )


# Global singleton instance of the service
notification_service = NotificationService()

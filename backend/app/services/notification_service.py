from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import CreateNotificationRequest
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams
from app.services.background_job_service import BackgroundJobService
from app.core.exceptions import ResourceNotFoundException, AuthorizationException
from app.core.enums import NotificationType

# Import the new notification engine components
from app.repositories.notification_repository import notification_repo
from app.services.notification.service import notification_service as engine
from app.services.notification.events import NotificationEvent


class NotificationService:
    """Enterprise Notification Center Service layer (Legacy Facade)."""

    def create_notification(self, db: Session, data: CreateNotificationRequest) -> Notification:
        """Synchronously creates a notification record in the database."""
        # Map legacy create call to default repository creation
        return notification_repo.create_notification(
            db=db,
            employee_id=data.employee_id,
            type="SYSTEM",
            title=data.title,
            message=data.message
        )

    def create_notification_async(
        self,
        bg_service: BackgroundJobService,
        data: CreateNotificationRequest
    ) -> None:
        """Asynchronously enqueues a notification creation job using the BackgroundJobService."""
        # Convert legacy call to new event structure and enqueue
        event = engine.create_event(
            event_type=NotificationType.SYSTEM,
            recipient_ids=[data.employee_id],
            payload={"subject": data.title, "body": data.message}
        )
        engine.trigger_event_async(bg_service, event)

    def mark_as_read(self, db: Session, notification_id: int, employee_id: int) -> Notification:
        """Marks a specific notification as read, validating ownership."""
        notification = db.get(Notification, notification_id)
        if not notification:
            raise ResourceNotFoundException(f"Notification with ID {notification_id} not found")
        
        if notification.employee_id != employee_id:
            raise AuthorizationException("You are not authorized to access this notification")

        # Delegate update to repository
        return notification_repo.mark_as_read(db, notification_id, employee_id)

    def mark_all_as_read(self, db: Session, employee_id: int) -> int:
        """Marks all unread notifications for a specific employee as read."""
        return notification_repo.mark_all_as_read(db, employee_id)

    def get_unread_count(self, db: Session, employee_id: int) -> int:
        """Retrieves count of unread notifications for a specific employee."""
        return notification_repo.get_unread_count(db, employee_id)

    def get_user_notifications(
        self,
        db: Session,
        employee_id: int,
        pagination_params: PaginationParams,
        filter_params: BaseFilterParams,
        sort_params: SortParams,
        unread_only: Optional[bool] = None,
        priority: Optional[str] = None,
        type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> tuple[list[Notification], int]:
        """Retrieves paginated, filtered, and sorted notifications for a specific employee."""
        return notification_repo.get_user_notifications(
            db=db,
            employee_id=employee_id,
            pagination_params=pagination_params,
            filter_params=filter_params,
            sort_params=sort_params,
            unread_only=unread_only,
            priority=priority,
            type=type,
            start_date=start_date,
            end_date=end_date
        )

    # Expose new event routing logic for backward/forward compatibility
    def trigger_event(self, db: Session, event: NotificationEvent) -> None:
        """Routes and dispatches a notification event synchronously."""
        engine.trigger_event(db, event)

    def trigger_event_async(
        self,
        bg_service: BackgroundJobService,
        event: NotificationEvent
    ) -> None:
        """Asynchronously enqueues event routing to the background worker."""
        engine.trigger_event_async(bg_service, event)

    def create_event(self, *args, **kwargs) -> NotificationEvent:
        """Creates a validated NotificationEvent instance."""
        return engine.create_event(*args, **kwargs)


notification_service = NotificationService()
# 📂 FILE: app/services/notification_service.py
import logging
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import CreateNotificationRequest
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams
from app.utils.query_engine import QueryEngine
from app.services.background_job_service import BackgroundJobService
from app.core.exceptions import ResourceNotFoundException, AuthorizationException
from app.logging.logger import app_logger


def create_notification_async_task(data_dict: dict) -> None:
    """Asynchronous worker task to write notification to the database."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Create and write notification record
        obj = Notification(
            title=data_dict["title"],
            message=data_dict["message"],
            employee_id=data_dict["employee_id"]
        )
        db.add(obj)
        db.commit()
        app_logger.info(f"Asynchronously created notification for employee {obj.employee_id} (ID: {obj.id})")
    except Exception as e:
        app_logger.error(f"Failed to create notification asynchronously: {e}", exc_info=True)
        raise
    finally:
        db.close()


class NotificationService:
    """Enterprise Notification Center Service layer."""

    def create_notification(self, db: Session, data: CreateNotificationRequest) -> Notification:
        """Synchronously creates a notification record in the database."""
        obj = Notification(
            title=data.title,
            message=data.message,
            employee_id=data.employee_id
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        app_logger.info(f"Created notification for employee {obj.employee_id} (ID: {obj.id})")
        return obj

    def create_notification_async(
        self,
        bg_service: BackgroundJobService,
        data: CreateNotificationRequest
    ) -> None:
        """Asynchronously enqueues a notification creation job using the BackgroundJobService."""
        bg_service.enqueue(create_notification_async_task, data.model_dump())

    def mark_as_read(self, db: Session, notification_id: int, employee_id: int) -> Notification:
        """Marks a specific notification as read, validating ownership."""
        notification = db.get(Notification, notification_id)
        if not notification:
            raise ResourceNotFoundException(f"Notification with ID {notification_id} not found")
        
        if notification.employee_id != employee_id:
            raise AuthorizationException("You are not authorized to access this notification")

        notification.is_read = True
        db.commit()
        db.refresh(notification)
        app_logger.info(f"Notification {notification_id} marked as read by employee {employee_id}")
        return notification

    def mark_all_as_read(self, db: Session, employee_id: int) -> int:
        """Marks all unread notifications for a specific employee as read."""
        stmt = (
            update(Notification)
            .where(Notification.employee_id == employee_id, Notification.is_read == False)
            .values(is_read=True)
        )
        result = db.execute(stmt)
        db.commit()
        count = result.rowcount
        app_logger.info(f"Marked {count} notifications as read for employee {employee_id}")
        return count

    def get_unread_count(self, db: Session, employee_id: int) -> int:
        """Retrieves count of unread notifications for a specific employee."""
        stmt = (
            select(func.count(Notification.id))
            .where(Notification.employee_id == employee_id, Notification.is_read == False)
        )
        return db.scalar(stmt) or 0

    def get_user_notifications(
        self,
        db: Session,
        employee_id: int,
        pagination_params: PaginationParams,
        filter_params: BaseFilterParams,
        sort_params: SortParams
    ) -> tuple[list[Notification], int]:
        """Retrieves paginated, filtered, and sorted notifications for a specific employee using the QueryEngine."""
        query = db.query(Notification).filter(Notification.employee_id == employee_id)
        
        # 1. Search columns configuration
        search_fields = ["title", "message"]
        
        # 2. Run query through pipeline
        items, total = QueryEngine.apply_pipeline(
            query=query,
            model=Notification,
            filters=filter_params,
            sort_params=sort_params,
            pagination_params=pagination_params,
            search_fields=search_fields,
            allowed_sort_fields=["id", "created_at", "title"],
            default_sort_by="created_at",
            default_sort_order="desc"
        )
        return items, total


notification_service = NotificationService()
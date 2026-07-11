# 📂 FILE: app/repositories/notification_repository.py
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy import select, update, and_, func, delete
from sqlalchemy.orm import Session

from app.repositories.base_repository import BaseRepository
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.schemas.pagination import PaginationParams, BaseFilterParams, SortParams
from app.utils.query_engine import QueryEngine


class NotificationRepository(BaseRepository):
    """Repository handling CRUD operations and custom database logic for notifications."""

    def __init__(self) -> None:
        super().__init__(Notification)

    def create_notification(
        self,
        db: Session,
        employee_id: int,
        type: str,
        title: str,
        message: str,
        priority: str = "NORMAL",
        status: str = "PENDING",
        channel: str = "IN_APP",
        event_id: Optional[str] = None,
        context_json: Optional[str] = None
    ) -> Notification:
        """Creates and persists a new Notification database record."""
        notification = Notification(
            employee_id=employee_id,
            type=type,
            title=title,
            message=message,
            priority=priority,
            status=status,
            channel=channel,
            event_id=event_id,
            context_json=context_json
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    def get_by_event_id(self, db: Session, event_id: str, channel: str) -> Optional[Notification]:
        """Retrieves a notification record by event_id and channel to support idempotency checks."""
        stmt = select(Notification).where(
            and_(
                Notification.event_id == event_id,
                Notification.channel == channel
            )
        )
        return db.scalar(stmt)

    def get_unread_count(self, db: Session, employee_id: int) -> int:
        """Retrieves count of unread notifications for a specific employee."""
        stmt = (
            select(func.count(Notification.id))
            .where(
                and_(
                    Notification.employee_id == employee_id,
                    Notification.is_read == False,
                    Notification.channel == "IN_APP"
                )
            )
        )
        return db.scalar(stmt) or 0

    def mark_as_read(self, db: Session, notification_id: int, employee_id: int) -> Optional[Notification]:
        """Marks a notification as read and updates read_at timestamp."""
        stmt = select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.employee_id == employee_id
            )
        )
        notification = db.scalar(stmt)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.commit()
            db.refresh(notification)
        return notification

    def mark_all_as_read(self, db: Session, employee_id: int) -> int:
        """Marks all unread notifications for a specific employee as read."""
        stmt = (
            update(Notification)
            .where(
                and_(
                    Notification.employee_id == employee_id,
                    Notification.is_read == False,
                    Notification.channel == "IN_APP"
                )
            )
            .values(is_read=True, read_at=datetime.now(timezone.utc).replace(tzinfo=None))
        )
        result = db.execute(stmt)
        db.commit()
        return result.rowcount

    def get_user_notifications(
        self,
        db: Session,
        employee_id: int,
        pagination_params: PaginationParams,
        filter_params: BaseFilterParams,
        sort_params: SortParams,
        channel: str = "IN_APP",
        unread_only: Optional[bool] = None,
        priority: Optional[str] = None,
        type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[Notification], int]:
        """Retrieves paginated, filtered, and sorted notifications for a specific employee."""
        query = db.query(Notification).filter(
            and_(
                Notification.employee_id == employee_id,
                Notification.channel == channel
            )
        )
        
        if unread_only is not None:
            query = query.filter(Notification.is_read == (not unread_only))
        if priority:
            query = query.filter(Notification.priority == priority)
        if type:
            query = query.filter(Notification.type == type)
        if start_date:
            query = query.filter(Notification.created_at >= start_date)
        if end_date:
            query = query.filter(Notification.created_at <= end_date)

        search_fields = ["title", "message"]
        items, total = QueryEngine.apply_pipeline(
            query=query,
            model=Notification,
            filters=filter_params,
            sort_params=sort_params,
            pagination_params=pagination_params,
            search_fields=search_fields,
            allowed_sort_fields=["id", "created_at", "title", "priority", "status"],
            default_sort_by="created_at",
            default_sort_order="desc"
        )
        return items, total

    # =========================================================================
    # Preference CRUD Operations
    # =========================================================================

    def get_user_preferences(self, db: Session, employee_id: int) -> List[NotificationPreference]:
        """Retrieves all channel preferences configured by a specific employee."""
        stmt = select(NotificationPreference).where(
            NotificationPreference.employee_id == employee_id
        )
        return list(db.scalars(stmt).all())

    def get_user_preference(
        self,
        db: Session,
        employee_id: int,
        notification_type: str,
        channel: str
    ) -> Optional[NotificationPreference]:
        """Retrieves a specific notification preference setting for an employee."""
        stmt = select(NotificationPreference).where(
            and_(
                NotificationPreference.employee_id == employee_id,
                NotificationPreference.notification_type == notification_type,
                NotificationPreference.channel == channel
            )
        )
        return db.scalar(stmt)

    def update_user_preference(
        self,
        db: Session,
        employee_id: int,
        notification_type: str,
        channel: str,
        enabled: bool
    ) -> NotificationPreference:
        """Creates or updates a specific notification channel setting for an employee."""
        pref = self.get_user_preference(db, employee_id, notification_type, channel)
        if not pref:
            pref = NotificationPreference(
                employee_id=employee_id,
                notification_type=notification_type,
                channel=channel,
                enabled=enabled
            )
            db.add(pref)
        else:
            pref.enabled = enabled
        db.commit()
        db.refresh(pref)
        return pref

    def delete_user_preference(
        self,
        db: Session,
        employee_id: int,
        notification_type: str,
        channel: str
    ) -> bool:
        """Deletes a specific user notification preference record."""
        pref = self.get_user_preference(db, employee_id, notification_type, channel)
        if pref:
            db.delete(pref)
            db.commit()
            return True
        return False

    # =========================================================================
    # Notification Log CRUD Operations
    # =========================================================================

    def log_delivery_attempt(
        self,
        db: Session,
        notification_id: int,
        channel: str,
        status: str,
        retry_count: int = 0,
        provider_response: Optional[str] = None,
        duration_ms: Optional[int] = None
    ) -> NotificationLog:
        """Creates a delivery attempt entry in the notification logs table."""
        log = NotificationLog(
            notification_id=notification_id,
            channel=channel,
            delivery_status=status,
            retry_count=retry_count,
            provider_response=provider_response,
            duration_ms=duration_ms
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def get_notification_logs(self, db: Session, notification_id: int) -> List[NotificationLog]:
        """Retrieves all delivery logs associated with a notification."""
        stmt = select(NotificationLog).where(
            NotificationLog.notification_id == notification_id
        ).order_by(NotificationLog.created_at.desc(), NotificationLog.id.desc())
        return list(db.scalars(stmt).all())

    def get_log_by_id(self, db: Session, log_id: int) -> Optional[NotificationLog]:
        """Retrieves a specific delivery log by id."""
        return db.get(NotificationLog, log_id)


notification_repo = NotificationRepository()

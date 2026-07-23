from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.repositories.notification_repository import notification_repo
from app.core.logger import app_logger


class SystemChannel(BaseChannel):
    """System notification channel strategy. Outputs alerts directly to server logs (stdout)."""

    @property
    def name(self) -> NotificationChannel:
        return NotificationChannel.SYSTEM

    def send(
        self,
        db: Session,
        recipient_id: int,
        title: str,
        message: str,
        notification_id: int,
    ) -> bool:
        # Output system alert telemetry
        app_logger.info(
            f"[SYSTEM ALERT] To Employee ID {recipient_id}: Title: '{title}' | Message: '{message}'"
        )

        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            notif.status = NotificationStatus.SENT.value
            db.commit()

            notification_repo.log_delivery_attempt(
                db=db,
                notification_id=notification_id,
                channel=self.name.value,
                status=NotificationStatus.SENT.value,
                retry_count=0,
                provider_response="System notification successfully logged to stdout",
            )
            return True

        app_logger.error(
            f"SystemChannel failed: Notification ID {notification_id} was not found in the database."
        )
        return False

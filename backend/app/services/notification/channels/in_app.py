# 📂 FILE: app/services/notification/channels/in_app.py
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.repositories.notification_repository import notification_repo
from app.core.logger import app_logger


class InAppChannel(BaseChannel):
    """In-App delivery channel that updates notification status to SENT in the database."""

    @property
    def name(self) -> NotificationChannel:
        return NotificationChannel.IN_APP

    def send(
        self,
        db: Session,
        recipient_id: int,
        title: str,
        message: str,
        notification_id: int,
    ) -> bool:
        app_logger.info(
            f"Delivering In-App notification (ID: {notification_id}) to employee {recipient_id}"
        )

        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            notif.status = NotificationStatus.SENT.value
            db.commit()

            # Log the successful delivery attempt
            notification_repo.log_delivery_attempt(
                db=db,
                notification_id=notification_id,
                channel=self.name.value,
                status=NotificationStatus.SENT.value,
                retry_count=0,
                provider_response="In-App notification successfully processed and state set to SENT",
            )
            return True

        app_logger.error(
            f"InAppChannel failed: Notification ID {notification_id} was not found in the database."
        )
        return False

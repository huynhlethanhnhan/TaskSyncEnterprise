# 📂 FILE: app/services/notification/channels/email.py
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.repositories.notification_repository import notification_repo
from app.models.employee import Employee
from app.services.email.service import email_service
from app.core.logger import app_logger


class EmailChannel(BaseChannel):
    """Email delivery channel adapter routing events to Enterprise EmailService."""

    @property
    def name(self) -> NotificationChannel:
        return NotificationChannel.EMAIL

    def send(self, db: Session, recipient_id: int, title: str, message: str, notification_id: int) -> bool:
        employee = db.get(Employee, recipient_id)
        if not employee or not employee.email:
            app_logger.error(f"EmailChannel failed: Employee ID {recipient_id} not found or email is empty.")
            self._mark_failed(db, notification_id, "Target employee email not found.")
            return False

        app_logger.info(f"Routing notification {notification_id} to EmailService for delivery to {employee.email}")
        
        success = email_service.send_notification_email(
            db=db,
            notification_id=notification_id,
            recipient_email=employee.email,
            subject=title,
            message_body=message
        )

        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            notif.status = NotificationStatus.SENT.value if success else NotificationStatus.FAILED.value
            db.commit()
            return success

        return False

    def _mark_failed(self, db: Session, notification_id: int, reason: str) -> None:
        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            notif.status = NotificationStatus.FAILED.value
            db.commit()
            notification_repo.log_delivery_attempt(
                db=db,
                notification_id=notification_id,
                channel=self.name.value,
                status=NotificationStatus.FAILED.value,
                retry_count=0,
                provider_response=reason
            )

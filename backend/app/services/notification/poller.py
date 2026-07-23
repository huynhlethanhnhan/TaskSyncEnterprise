import threading
import time
from sqlalchemy import select, and_, func
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.notification_log import NotificationLog
from app.models.employee import Employee
from app.services.email.service import email_service
from app.core.logger import app_logger
from app.core.enums import NotificationStatus

# Global event to control poller thread lifecycle
poller_stop_event = threading.Event()


def retry_failed_emails(db: Session) -> None:
    """Queries failed email notifications and attempts delivery retry if threshold (5) is not met."""
    stmt = (
        select(Notification)
        .where(and_(Notification.channel == "EMAIL", Notification.status == "FAILED"))
        .order_by(Notification.created_at.asc())
        .limit(10)
    )
    failed_notifications = db.scalars(stmt).all()

    for notif in failed_notifications:
        # Count preceding attempts logged for this notification
        count_stmt = select(func.count(NotificationLog.id)).where(
            NotificationLog.notification_id == notif.id
        )
        attempts = db.scalar(count_stmt) or 0

        if attempts >= 5:
            # Skip since we exceeded standard retry limit
            app_logger.debug(
                f"Notification ID {notif.id} has reached maximum retry limits ({attempts}). Skipping retry."
            )
            continue

        app_logger.info(
            f"Retrying failed notification ID {notif.id} (Channel: EMAIL, Previous attempts: {attempts})"
        )

        employee = db.get(Employee, notif.employee_id)
        if not employee or not employee.email:
            app_logger.error(
                f"Retry failed for notification ID {notif.id}: Recipient not found or has no email address."
            )
            continue

        try:
            # Resend email - send_notification_email automatically logs attempts and commits status
            email_service.send_notification_email(
                db=db,
                notification_id=notif.id,
                recipient_email=employee.email,
                subject=notif.title,
                message_body=notif.message,
            )
        except Exception as retry_err:
            app_logger.error(
                f"Retry execution failure for notification ID {notif.id}: {retry_err}"
            )


def start_email_retry_poller() -> None:
    """Launches the background daemon thread executing retry poller cycles."""
    import sys
    from app.config import settings

    if "pytest" in sys.modules or settings.ENVIRONMENT == "testing":
        app_logger.info("Email retry poller thread bypassed in testing environment.")
        return

    poller_stop_event.clear()

    def loop_wrapper():
        from app.database import SessionLocal

        app_logger.info("Email retry poller thread started successfully.")

        while not poller_stop_event.is_set():
            try:
                db = SessionLocal()
                retry_failed_emails(db)
                db.close()
            except Exception as loop_ex:
                app_logger.error(
                    f"Unhandled error in email retry poller execution cycle: {loop_ex}"
                )

            # Sleep in 1-second chunks to quickly respond to stop events
            for _ in range(60):
                if poller_stop_event.is_set():
                    break
                time.sleep(1)

        app_logger.info("Email retry poller thread stopped cleanly.")

    poller_thread = threading.Thread(
        target=loop_wrapper, daemon=True, name="EmailRetryPoller"
    )
    poller_thread.start()


def stop_email_retry_poller() -> None:
    """Signals the daemon thread to terminate."""
    poller_stop_event.set()

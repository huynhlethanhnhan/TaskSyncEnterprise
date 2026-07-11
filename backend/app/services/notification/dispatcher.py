# 📂 FILE: app/services/notification/dispatcher.py
import json
from typing import List
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus, NotificationType
from app.core.logger import app_logger
from app.services.notification.events import NotificationEvent
from app.services.notification.formatter import NotificationFormatter
from app.services.notification.registry import channel_registry
from app.repositories.notification_repository import notification_repo


class NotificationDispatcher:
    """Orchestrator responsible for resolving user settings, formatting, and routing notifications."""

    def dispatch(self, db: Session, event: NotificationEvent) -> None:
        """Processes notification event dispatch for all targets."""
        # 1. Format the raw subject and message using our templating formatter
        title, message = NotificationFormatter.format(event.event_type, event.payload)

        # 2. Iterate through target recipients
        for recipient_id in event.recipient_ids:
            try:
                # 3. Resolve user-specific preferences
                enabled_channels = self._resolve_channels(db, recipient_id, event.event_type)

                # 4. Dispatch to each enabled channel
                for channel in enabled_channels:
                    notification_record = None
                    try:
                        db_channel = "IN_APP" if channel == NotificationChannel.SYSTEM else channel.value
                        # 5. Persist record to notifications table in database (Status: PROCESSING)
                        notification_record = notification_repo.create_notification(
                            db=db,
                            employee_id=recipient_id,
                            type=event.event_type.value,
                            title=title,
                            message=message,
                            priority=event.priority.value,
                            status=NotificationStatus.PROCESSING.value,
                            channel=db_channel,
                            event_id=event.event_id,
                            context_json=json.dumps(event.payload)
                        )

                        # 6. Retrieve delivery channel strategy
                        channel_adapter = channel_registry.get(channel)

                        # 7. Execute delivery
                        success = channel_adapter.send(
                            db=db,
                            recipient_id=recipient_id,
                            title=title,
                            message=message,
                            notification_id=notification_record.id
                        )

                        if not success:
                            self._mark_failed(db, notification_record.id, "Delivery adapter returned False")

                    except Exception as ch_err:
                        app_logger.error(
                            f"Error during notification dispatch via channel '{channel.value}' "
                            f"to recipient {recipient_id}: {str(ch_err)}",
                            exc_info=True
                        )
                        if notification_record:
                            self._mark_failed(db, notification_record.id, str(ch_err))

            except Exception as rec_err:
                app_logger.error(
                    f"Orchestration failure resolving preferences or routing for recipient {recipient_id}: {str(rec_err)}",
                    exc_info=True
                )

    def _resolve_channels(self, db: Session, employee_id: int, event_type: NotificationType) -> List[NotificationChannel]:
        """Resolves preferences or falls back to IN_APP and EMAIL by default."""
        prefs = notification_repo.get_user_preferences(db, employee_id)
        
        type_str = event_type.value
        filtered_prefs = [p for p in prefs if p.notification_type == type_str]

        if not filtered_prefs:
            # System default: enable in-app and email
            return [NotificationChannel.IN_APP, NotificationChannel.EMAIL]

        enabled = [NotificationChannel(p.channel) for p in filtered_prefs if p.enabled]
        
        # Ensure fallback so notifications are never entirely lost
        if not enabled:
            return [NotificationChannel.IN_APP]

        return enabled

    def _mark_failed(self, db: Session, notification_id: int, error_message: str) -> None:
        """Helper to mark a notification record as FAILED and log the error context."""
        try:
            notif = notification_repo.get_by_id(db, notification_id)
            if notif:
                notif.status = NotificationStatus.FAILED.value
                db.commit()
                notification_repo.log_delivery_attempt(
                    db=db,
                    notification_id=notification_id,
                    channel=notif.channel,
                    status=NotificationStatus.FAILED.value,
                    retry_count=0,
                    provider_response=f"Delivery failure details: {error_message}"
                )
        except Exception as mark_ex:
            app_logger.error(f"Failed to write failure audit for notification {notification_id}: {mark_ex}")

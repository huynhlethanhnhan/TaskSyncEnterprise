# 📂 FILE: app/services/notification/channels/websocket.py
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.repositories.notification_repository import notification_repo
from app.core.logger import app_logger


class WebSocketChannel(BaseChannel):
    """WebSocket delivery channel adapter. Simulated placeholder for real-time pushes."""

    @property
    def name(self) -> NotificationChannel:
        return NotificationChannel.WEBSOCKET

    def send(self, db: Session, recipient_id: int, title: str, message: str, notification_id: int) -> bool:
        app_logger.info(f"Simulated WebSocket push for employee {recipient_id}: Title: '{title}'")
        
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
                provider_response="WebSocket push simulation succeeded."
            )
            return True
            
        app_logger.error(f"WebSocketChannel failed: Notification ID {notification_id} was not found in the database.")
        return False

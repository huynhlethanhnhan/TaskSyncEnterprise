import asyncio
import concurrent.futures
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel, NotificationStatus
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.repositories.notification_repository import notification_repo
from app.services.notification.websocket_manager import websocket_manager
from app.core.logger import app_logger


class WebSocketChannel(BaseChannel):
    """WebSocket delivery channel adapter. Sends real-time pushes via ConnectionManager."""

    @property
    def name(self) -> NotificationChannel:
        return NotificationChannel.WEBSOCKET

    def send(
        self,
        db: Session,
        recipient_id: int,
        title: str,
        message: str,
        notification_id: int,
    ) -> bool:
        app_logger.info(
            f"Initiating WebSocket push for employee {recipient_id} (notification: {notification_id})"
        )

        payload = {
            "id": notification_id,
            "title": title,
            "message": message,
            "channel": "WEBSOCKET",
        }

        # Safely schedule the coroutine from synchronous threads
        success = False
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        coro = websocket_manager.send_private_notification(recipient_id, payload)
        if loop and loop.is_running():
            future = asyncio.run_coroutine_threadsafe(coro, loop)
            try:
                success = future.result(timeout=2.0)
            except concurrent.futures.TimeoutError:
                app_logger.warning(
                    f"WebSocket push timed out for employee {recipient_id}"
                )
                success = False
            except Exception as fut_err:
                app_logger.error(f"WebSocket future delivery failed: {fut_err}")
                success = False
        else:
            try:
                success = asyncio.run(coro)
            except Exception as run_err:
                app_logger.error(f"WebSocket execution failed: {run_err}")
                success = False

        # Persist status updates in database
        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            # WebSocket is best-effort real-time. If offline, the database notification remains unread (IN_APP)
            notif.status = NotificationStatus.SENT.value
            db.commit()

            provider_msg = (
                "WebSocket push delivered successfully."
                if success
                else "User offline; notification cached in DB for in-app retrieval."
            )

            notification_repo.log_delivery_attempt(
                db=db,
                notification_id=notification_id,
                channel=self.name.value,
                status=NotificationStatus.SENT.value,
                retry_count=0,
                provider_response=provider_msg,
            )
            return True

        app_logger.error(
            f"WebSocketChannel failed: Notification ID {notification_id} was not found in the database."
        )
        return False

import asyncio
import concurrent.futures
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.employee import Employee
from app.models.token_blacklist import TokenBlacklist
from app.core.logger import app_logger


class WebSocketConnectionManager:
    """Enterprise Connection Registry managing active authenticated real-time client sessions."""

    def __init__(self) -> None:
        # Map user_id (int) -> List of WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self._event_loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """Registers a new authenticated connection under the recipient's private user channel."""
        self._event_loop = asyncio.get_running_loop()
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        app_logger.info(
            f"WebSocket client registered: User ID {user_id} (Total sessions: {len(self.active_connections[user_id])})"
        )

    def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        """Safely cleans up registered connection metadata upon client disconnect."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                app_logger.info(f"WebSocket client disconnected: User ID {user_id}")
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_private_notification(
        self, user_id: int, notification_data: dict
    ) -> bool:
        """
        Sends a private message to all active WebSocket sessions of a specific user.
        Returns:
            True if user is online and messages were dispatched, False otherwise.
        """
        if (
            user_id not in self.active_connections
            or not self.active_connections[user_id]
        ):
            app_logger.debug(
                f"WebSocket delivery skipped: User ID {user_id} is offline"
            )
            return False

        success = False
        # Create a shallow copy to iterate safely during dynamic disconnects
        connections = list(self.active_connections[user_id])
        for connection in connections:
            try:
                await connection.send_json(notification_data)
                success = True
            except Exception as send_err:
                app_logger.warning(
                    f"Failed to send JSON over WebSocket to user {user_id}: {send_err}"
                )
                self.disconnect(connection, user_id)

        return success

    def send_private_notification_threadsafe(
        self, user_id: int, notification_data: dict
    ) -> bool:
        """Dispatch from synchronous FastAPI worker threads onto the WebSocket loop."""
        loop = self._event_loop
        if loop is None or loop.is_closed() or not loop.is_running():
            return False

        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if current_loop is loop:
            loop.create_task(self.send_private_notification(user_id, notification_data))
            return True

        future = asyncio.run_coroutine_threadsafe(
            self.send_private_notification(user_id, notification_data), loop
        )
        try:
            return future.result(timeout=2.0)
        except concurrent.futures.TimeoutError:
            future.cancel()
            app_logger.warning(f"WebSocket delivery timed out for user ID {user_id}")
            return False
        except Exception as error:
            app_logger.warning(
                f"WebSocket delivery failed for user ID {user_id}: {error}"
            )
            return False

    async def broadcast(self, notification_data: dict) -> int:
        """
        Sends a message to all connected clients (system-wide broadcast).
        Returns:
            Count of successfully dispatched messages.
        """
        success_count = 0
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_json(notification_data)
                    success_count += 1
                except Exception:
                    self.disconnect(connection, user_id)
        return success_count

    def broadcast_threadsafe(self, event_data: dict) -> bool:
        """Broadcast a domain event from a synchronous API worker."""
        loop = self._event_loop
        if loop is None or loop.is_closed() or not loop.is_running():
            return False

        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if current_loop is loop:
            loop.create_task(self.broadcast(event_data))
            return True

        future = asyncio.run_coroutine_threadsafe(self.broadcast(event_data), loop)

        def log_failure(completed_future):
            try:
                completed_future.result()
            except Exception as error:
                app_logger.warning(f"WebSocket domain-event broadcast failed: {error}")

        future.add_done_callback(log_failure)
        return True


# Global singleton manager
websocket_manager = WebSocketConnectionManager()


def get_websocket_user(token: str, db: Session) -> Employee | None:
    """Validates the JWT token passed in connection query params and yields the active Employee."""
    try:
        # Decode and verify token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
        )
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            return None

        # Check blacklist
        stmt_blacklist = select(TokenBlacklist).where(TokenBlacklist.token == token)
        is_blacklisted = db.execute(stmt_blacklist).scalar_one_or_none()
        if is_blacklisted:
            app_logger.warning(
                "WebSocket token validation rejected: Token is blacklisted."
            )
            return None

        # Resolve employee
        stmt = select(Employee).where(Employee.id == int(user_id_str))
        employee = db.execute(stmt).scalar_one_or_none()
        if not employee or employee.is_deleted:
            return None

        return employee
    except Exception as err:
        app_logger.warning(f"WebSocket token validation failed: {err}")
        return None

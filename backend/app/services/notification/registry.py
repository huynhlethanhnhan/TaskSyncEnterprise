# 📂 FILE: app/services/notification/registry.py
from typing import Dict
from app.core.enums import NotificationChannel
from app.services.notification.channels.base import NotificationChannel as BaseChannel
from app.services.notification.channels.in_app import InAppChannel
from app.services.notification.channels.email import EmailChannel
from app.services.notification.channels.websocket import WebSocketChannel
from app.services.notification.channels.push import PushChannel
from app.services.notification.channels.system import SystemChannel


class ChannelRegistry:
    """Registry that manages configured and custom delivery channel strategies."""

    def __init__(self) -> None:
        self._channels: Dict[NotificationChannel, BaseChannel] = {}
        # Auto-register core channels
        self.register(InAppChannel())
        self.register(EmailChannel())
        self.register(WebSocketChannel())
        self.register(PushChannel())
        self.register(SystemChannel())

    def register(self, channel: BaseChannel) -> None:
        """Adds a new channel adapter strategy to the registry."""
        self._channels[channel.name] = channel

    def get(self, name: NotificationChannel) -> BaseChannel:
        """Retrieves a registered channel strategy adapter."""
        channel = self._channels.get(name)
        if not channel:
            raise ValueError(
                f"Notification delivery channel strategy '{name}' is not registered."
            )
        return channel


# Global singleton instance of the registry
channel_registry = ChannelRegistry()

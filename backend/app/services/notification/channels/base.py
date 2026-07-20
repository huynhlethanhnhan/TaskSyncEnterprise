# 📂 FILE: app/services/notification/channels/base.py
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from app.core.enums import NotificationChannel


class NotificationChannel(ABC):
    """Abstract interface defining required contract methods for notification delivery channels."""

    @property
    @abstractmethod
    def name(self) -> NotificationChannel:
        """Returns the channel enum indicator."""
        pass

    @abstractmethod
    def send(
        self,
        db: Session,
        recipient_id: int,
        title: str,
        message: str,
        notification_id: int,
    ) -> bool:
        """
        Sends the notification to the target recipient.
        Returns:
            True if delivery succeeded, False otherwise.
        """
        pass

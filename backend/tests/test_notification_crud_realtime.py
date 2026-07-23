from unittest import TestCase
from unittest.mock import Mock, patch

from app.crud.notification import create


class NotificationCrudRealtimeTests(TestCase):
    @patch(
        "app.services.notification.websocket_manager.websocket_manager.send_private_notification_threadsafe"
    )
    def test_create_pushes_the_committed_notification_to_all_browser_sessions(
        self, send_private_notification_threadsafe: Mock
    ) -> None:
        db = Mock()

        def assign_database_id(notification) -> None:
            notification.id = 321

        db.refresh.side_effect = assign_database_id

        notification = create(
            db,
            title="Bạn có task mới",
            message="Kiểm thử nhiều thiết bị",
            employee_id=42,
        )

        db.commit.assert_called_once()
        send_private_notification_threadsafe.assert_called_once_with(
            42,
            {
                "id": 321,
                "title": "Bạn có task mới",
                "message": "Kiểm thử nhiều thiết bị",
                "channel": "WEBSOCKET",
            },
        )
        self.assertEqual(notification.id, 321)

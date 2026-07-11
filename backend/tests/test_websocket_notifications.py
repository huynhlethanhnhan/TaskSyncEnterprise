import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy import select

from app.models.employee import Employee
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.notification_log import NotificationLog
from app.core.security import get_password_hash
from app.core.constants import ROLE_EMPLOYEE
from app.core.enums import NotificationType, NotificationChannel
from app.services.notification_service import notification_service
from app.services.notification.poller import retry_failed_emails


def test_websocket_missing_token(client):
    """Verify that connecting to /ws/notifications without a token closes the socket with 4008."""
    with client.websocket_connect("/ws/notifications") as websocket:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            websocket.receive_text()
        assert exc_info.value.code == 4008


def test_websocket_invalid_token(client):
    """Verify that connecting to /ws/notifications with an invalid token closes the socket with 4008."""
    with client.websocket_connect("/ws/notifications?token=invalidtoken") as websocket:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            websocket.receive_text()
        assert exc_info.value.code == 4008


def test_websocket_valid_flow(client, db):
    """Verify authenticating, heartbeat ping-pong, and real-time private socket pushes."""
    # 1. Setup employee
    emp_email = "ws_test_user@example.com"
    emp = Employee(
        employee_code="EMP_WS_999",
        full_name="Web Socket User",
        email=emp_email,
        password_hash=get_password_hash("password123"),
        role_id=ROLE_EMPLOYEE,
        is_active=True,
        is_deleted=False,
        is_first_login=False,
        login_count=0
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    # Login to acquire token
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": emp_email, "password": "password123"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Set up user preference to deliver SYSTEM notifications via WEBSOCKET channel
    pref = NotificationPreference(
        employee_id=emp.id,
        notification_type="SYSTEM",
        channel="WEBSOCKET",
        enabled=True
    )
    db.add(pref)
    db.commit()

    # 2. Open WebSocket connection
    with client.websocket_connect(f"/ws/notifications?token={token}") as ws:
        # Test heartbeat
        ws.send_text("ping")
        resp = ws.receive_text()
        assert resp == "pong"

        # Trigger a system event for this employee
        event = notification_service.create_event(
            event_type=NotificationType.SYSTEM,
            recipient_ids=[emp.id],
            payload={"subject": "WS Push", "body": "This is sent over websocket!"}
        )
        notification_service.trigger_event(db, event)

        # Receive real-time push over socket
        data = ws.receive_json()
        assert data["title"] == "WS Push"
        assert data["message"] == "This is sent over websocket!"
        assert data["channel"] == "WEBSOCKET"


def test_websocket_private_channels(client, db):
    """Verify that socket pushes are private and not broadcast globally to other users."""
    # Create two users
    u1_email = "u1_ws@example.com"
    u1 = Employee(
        employee_code="EMP_WS_001",
        full_name="User 1",
        email=u1_email,
        password_hash=get_password_hash("pass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True
    )
    u2_email = "u2_ws@example.com"
    u2 = Employee(
        employee_code="EMP_WS_002",
        full_name="User 2",
        email=u2_email,
        password_hash=get_password_hash("pass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True
    )
    db.add_all([u1, u2])
    db.commit()

    # Get tokens
    token1 = client.post("/api/v1/auth/login", data={"username": u1_email, "password": "pass"}).json()["access_token"]
    token2 = client.post("/api/v1/auth/login", data={"username": u2_email, "password": "pass"}).json()["access_token"]

    # Set WEBSOCKET preference for User 1
    p1 = NotificationPreference(employee_id=u1.id, notification_type="SYSTEM", channel="WEBSOCKET", enabled=True)
    db.add(p1)
    db.commit()

    # Open sockets for both
    with client.websocket_connect(f"/ws/notifications?token={token1}") as ws1:
        with client.websocket_connect(f"/ws/notifications?token={token2}") as ws2:
            # Trigger notification to User 1 only
            event = notification_service.create_event(
                event_type=NotificationType.SYSTEM,
                recipient_ids=[u1.id],
                payload={"subject": "Private Event", "body": "For User 1 Only"}
            )
            notification_service.trigger_event(db, event)

            # ws1 must receive it
            msg = ws1.receive_json()
            assert msg["title"] == "Private Event"

            # ws2 must NOT receive it (timeout or no message)
            # Since TestClient websocket blocks, we can send ping to ws2 to verify it is still healthy and hasn't received anything else
            ws2.send_text("ping")
            assert ws2.receive_text() == "pong"


def test_email_retry_poller(db):
    """Verify that the poller gathers failed emails and triggers retry."""
    emp = Employee(
        employee_code="EMP_POLL_001",
        full_name="Poller Employee",
        email="poller@example.com",
        password_hash=get_password_hash("pass"),
        role_id=ROLE_EMPLOYEE,
        is_active=True
    )
    db.add(emp)
    db.commit()

    # Create a failed email notification record
    failed_notif = Notification(
        employee_id=emp.id,
        type="SYSTEM",
        title="Retry Subject",
        message="Retry Body",
        channel="EMAIL",
        status="FAILED"
    )
    db.add(failed_notif)
    db.commit()

    # Patch email_service to verify the send call is executed
    with patch("app.services.email.service.EmailService.send_notification_email") as mock_send:
        mock_send.return_value = True

        retry_failed_emails(db)

        # Confirm send was invoked
        mock_send.assert_called_once()

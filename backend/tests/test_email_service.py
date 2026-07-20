# 📂 FILE: backend/tests/test_email_service.py
import pytest
import smtplib
from unittest.mock import patch, MagicMock
from app.services.email.dto import EmailMessage
from app.services.email.service import EmailService
from app.services.email.smtp_client import SMTPConfig, SMTPClient


def test_smtp_configuration_loading():
    service = EmailService()
    assert service.smtp_config.host is not None
    assert service.smtp_config.port == 587
    assert service.smtp_config.use_tls is True


def test_email_sending_success(mock_smtp_client):
    service = EmailService()
    message = EmailMessage(
        sender_name="System",
        sender_address="sender@test.com",
        recipients=["receiver@test.com"],
        subject="Hello",
        body_text="Plain Text Content",
    )

    result = service.send_email_with_retry(message)
    assert result.success is True
    assert result.provider == "SMTP"
    assert result.retry_count == 0
    assert result.provider_response == "SMTP delivery successful"


def test_email_sending_transient_retry_success():
    # Mock SMTPClient.send to raise socket timeout once, then succeed on second attempt
    send_mock = MagicMock(
        side_effect=[smtplib.SMTPConnectError(500, "Transient error"), "Success"]
    )

    with patch("app.services.email.smtp_client.SMTPClient.send", send_mock):
        service = EmailService()
        message = EmailMessage(
            sender_name="System",
            sender_address="sender@test.com",
            recipients=["receiver@test.com"],
            subject="Hello Retry",
            body_text="Content",
        )

        # Override sleep to run tests fast
        with patch("time.sleep", return_value=None):
            result = service.send_email_with_retry(
                message, max_retries=2, backoff_base=0.1
            )

        assert result.success is True
        assert result.retry_count == 1
        assert send_mock.call_count == 2


def test_email_sending_permanent_failure():
    # Mock SMTPClient.send to raise Authentication error
    send_mock = MagicMock(
        side_effect=smtplib.SMTPAuthenticationError(535, "Bad credentials")
    )

    with patch("app.services.email.smtp_client.SMTPClient.send", send_mock):
        service = EmailService()
        message = EmailMessage(
            sender_name="System",
            sender_address="sender@test.com",
            recipients=["receiver@test.com"],
            subject="Auth Failure",
            body_text="Content",
        )

        result = service.send_email_with_retry(message, max_retries=3)
        assert result.success is False
        assert result.retry_count == 0  # Should abort immediately on permanent failure
        assert "Bad credentials" in result.failure_reason
        assert send_mock.call_count == 1


def test_email_sending_exhausted_retries():
    # Mock SMTPClient.send to always raise connection error
    send_mock = MagicMock(
        side_effect=smtplib.SMTPConnectError(500, "Connection refused")
    )

    with patch("app.services.email.smtp_client.SMTPClient.send", send_mock):
        service = EmailService()
        message = EmailMessage(
            sender_name="System",
            sender_address="sender@test.com",
            recipients=["receiver@test.com"],
            subject="Exhausted Retries",
            body_text="Content",
        )

        with patch("time.sleep", return_value=None):
            result = service.send_email_with_retry(
                message, max_retries=2, backoff_base=0.1
            )

        assert result.success is False
        assert result.retry_count == 2
        assert send_mock.call_count == 3  # Initial + 2 retries = 3 calls


def test_connection_manager_reuse():
    # Test connection caching using MagicMock
    mock_smtp = MagicMock()
    mock_smtp.noop.return_value = (250, b"OK")

    with patch("smtplib.SMTP", return_value=mock_smtp):
        config = SMTPConfig(host="localhost", port=25)
        client = SMTPClient(config)

        conn1 = client.manager.get_connection()
        conn2 = client.manager.get_connection()

        # Connection should be reused
        assert conn1 is conn2
        assert mock_smtp.noop.call_count == 1

        client.shutdown()
        # Should call quit to close connection
        assert mock_smtp.quit.call_count == 1

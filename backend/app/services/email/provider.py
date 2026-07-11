# 📂 FILE: app/services/email/provider.py
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from app.services.email.dto import EmailMessage, EmailResult
from app.services.email.smtp_client import SMTPClient, SMTPConfig
from app.core.logger import app_logger


class EmailProvider(ABC):
    """Abstract interface defining the contract for all email delivery adapters."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Returns the provider identification string."""
        pass

    @abstractmethod
    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        """Sends the message via the adapter's gateway and returns audit results."""
        pass


class SMTPProvider(EmailProvider):
    """Concrete SMTP email provider strategy."""

    def __init__(self, config: SMTPConfig) -> None:
        self.config = config
        self.client = SMTPClient(config)

    @property
    def name(self) -> str:
        return "SMTP"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        start_time = time.perf_counter()
        try:
            # Enforce override timeout if supplied
            self.client.config.timeout = timeout

            response = self.client.send(
                sender_address=message.sender_address,
                sender_name=message.sender_name,
                recipients=message.recipients,
                cc=message.cc,
                bcc=message.bcc,
                reply_to=message.reply_to,
                subject=message.subject,
                body_text=message.body_text,
                body_html=message.body_html
            )
            duration = int((time.perf_counter() - start_time) * 1000)
            return EmailResult(
                success=True,
                provider=self.name,
                retry_count=0,
                duration_ms=duration,
                provider_response=response
            )
        except Exception as e:
            duration = int((time.perf_counter() - start_time) * 1000)
            app_logger.error(f"SMTP delivery failed: {str(e)}", exc_info=True)
            return EmailResult(
                success=False,
                provider=self.name,
                retry_count=0,
                duration_ms=duration,
                failure_reason=str(e)
            )

    def shutdown(self) -> None:
        """Gracefully closes SMTP connections."""
        self.client.shutdown()


# =========================================================================
# Future Integration Stubs
# =========================================================================

class GmailSMTPProvider(EmailProvider):
    @property
    def name(self) -> str:
        return "GMAIL"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        raise NotImplementedError("Gmail API provider integration is a future stub.")


class OutlookSMTPProvider(EmailProvider):
    @property
    def name(self) -> str:
        return "OUTLOOK"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        raise NotImplementedError("Outlook SMTP provider integration is a future stub.")


class AWSSESProvider(EmailProvider):
    @property
    def name(self) -> str:
        return "AWS_SES"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        raise NotImplementedError("AWS SES provider integration is a future stub.")


class SendGridProvider(EmailProvider):
    @property
    def name(self) -> str:
        return "SENDGRID"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        raise NotImplementedError("SendGrid provider integration is a future stub.")


class MailgunProvider(EmailProvider):
    @property
    def name(self) -> str:
        return "MAILGUN"

    def send_email(self, message: EmailMessage, timeout: int = 10) -> EmailResult:
        raise NotImplementedError("Mailgun provider integration is a future stub.")

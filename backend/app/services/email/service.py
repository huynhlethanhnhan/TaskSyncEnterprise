# 📂 FILE: app/services/email/service.py
import time
import json
from typing import Dict, Optional, List
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.core.logger import app_logger
from app.services.email.dto import EmailMessage, EmailResult
from app.services.email.provider import (
    EmailProvider,
    SMTPProvider,
    GmailSMTPProvider,
    OutlookSMTPProvider,
    AWSSESProvider,
    SendGridProvider,
    MailgunProvider,
    SMTPConfig
)
from app.repositories.notification_repository import notification_repo
from app.services.email.engine import EmailTemplateEngine
from app.models.employee import Employee


class EmailService:
    """Enterprise Service responsible for selecting provider, retry policy, and audit logging."""

    def __init__(self, provider_override: Optional[str] = None) -> None:
        # Load SMTP settings from centralized config
        self.smtp_config = SMTPConfig(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
            use_ssl=settings.SMTP_USE_SSL,
            timeout=settings.SMTP_TIMEOUT
        )
        
        # Registry of provider strategies
        self._providers: Dict[str, EmailProvider] = {
            "SMTP": SMTPProvider(self.smtp_config),
            "GMAIL": GmailSMTPProvider(),
            "OUTLOOK": OutlookSMTPProvider(),
            "AWS_SES": AWSSESProvider(),
            "SENDGRID": SendGridProvider(),
            "MAILGUN": MailgunProvider()
        }

        # Resolve active provider strategy
        active_name = (provider_override or settings.EMAIL_PROVIDER).upper()
        self.active_provider = self._providers.get(active_name)
        if not self.active_provider:
            raise ValueError(f"Configured Email Provider '{active_name}' is not supported.")

        # Initialize the email template rendering engine
        self.template_engine = EmailTemplateEngine()

    def send_email_with_retry(
        self,
        message: EmailMessage,
        max_retries: int = 3,
        backoff_base: float = 2.0
    ) -> EmailResult:
        """Sends an email with exponential backoff on transient network failures."""
        attempt = 0
        last_result: Optional[EmailResult] = None

        # Fallback values from settings
        if not message.sender_address:
            message.sender_address = settings.EMAIL_SENDER_ADDRESS
        if not message.sender_name:
            message.sender_name = settings.EMAIL_SENDER_NAME

        while attempt <= max_retries:
            start_time = time.perf_counter()
            result = self.active_provider.send_email(message, timeout=settings.SMTP_TIMEOUT)
            duration_ms = int((time.perf_counter() - start_time) * 1000)

            # Record retry context
            result.retry_count = attempt
            result.duration_ms = duration_ms
            last_result = result

            if result.success:
                return result

            # Detect Permanent Failures vs. Transient network failures
            if self._is_permanent_failure(result.failure_reason):
                app_logger.error(
                    f"Permanent email delivery failure detected: {result.failure_reason}. Retries aborted."
                )
                return result

            attempt += 1
            if attempt <= max_retries:
                sleep_duration = backoff_base ** attempt
                app_logger.warning(
                    f"Transient email delivery failure. Retrying attempt {attempt}/{max_retries} "
                    f"in {sleep_duration:.2f}s... Reason: {result.failure_reason}"
                )
                time.sleep(sleep_duration)

        app_logger.error(f"Email delivery exhausted all {max_retries} retry attempts.")
        return last_result

    def send_notification_email(
        self,
        db: Session,
        notification_id: int,
        recipient_email: str,
        subject: str,
        message_body: str
    ) -> bool:
        """
        Public facade called by Notification Engine. Formulates EmailMessage,
        runs retry loop, and logs the execution results in the logs table.
        """
        # 1. Build initial context and fallbacks
        context = {
            "subject": subject,
            "body": message_body,
            "employee_name": "Team Member"
        }
        
        template_name = "system_alert"
        
        # 2. Fetch parent notification metadata to map template contexts
        notif = notification_repo.get_by_id(db, notification_id)
        if notif:
            employee = db.get(Employee, notif.employee_id)
            if employee:
                context["employee_name"] = employee.full_name
                
            if notif.context_json:
                try:
                    payload = json.loads(notif.context_json)
                    context.update(payload)
                except Exception:
                    pass
            
            # Map notification types to specific templates
            if notif.type == "TASKS":
                template_name = "task_assigned"
            elif notif.type == "VACATION":
                status = str(context.get("status", "")).upper()
                if status == "APPROVED":
                    template_name = "vacation_approved"
                elif status == "REJECTED":
                    template_name = "vacation_rejected"
                else:
                    template_name = "vacation_requested"
            elif notif.type == "COMMENTS":
                template_name = "comment_added"
            elif notif.type == "AUTHENTICATION":
                template_name = "security_alert"

        # 3. Securely render HTML and Plain Text versions of the email
        try:
            body_html = self.template_engine.render_html(template_name, context)
            body_text = self.template_engine.render_plain(template_name, context)
        except Exception as render_ex:
            app_logger.error(
                f"Template rendering failed for '{template_name}'. Falling back to plain text. Error: {render_ex}"
            )
            body_html = None
            body_text = message_body

        message = EmailMessage(
            sender_name=settings.EMAIL_SENDER_NAME,
            sender_address=settings.EMAIL_SENDER_ADDRESS,
            recipients=[recipient_email],
            subject=subject,
            body_text=body_text,
            body_html=body_html
        )

        result = self.send_email_with_retry(message)

        # Log delivery attempt in persistence layer
        status_str = "SENT" if result.success else "FAILED"
        response_str = result.provider_response or result.failure_reason

        notification_repo.log_delivery_attempt(
            db=db,
            notification_id=notification_id,
            channel="EMAIL",
            status=status_str,
            retry_count=result.retry_count,
            provider_response=response_str,
            duration_ms=result.duration_ms
        )

        return result.success

    def _is_permanent_failure(self, error_message: Optional[str]) -> bool:
        """Determines if the failure is un-retryable (invalid credential/recipient/argument)."""
        if not error_message:
            return False
        
        permanent_keywords = [
            "SMTPAuthenticationError",
            "SMTPRecipientsRefused",
            "SMTPHeloError",
            "NotImplementedError",
            "ValueError",
            "bad credentials",
            "authentication failed"
        ]
        return any(kw in error_message or kw.lower() in error_message.lower() for kw in permanent_keywords)

    def shutdown(self) -> None:
        """Closes any active cached provider client connections."""
        if hasattr(self.active_provider, "shutdown"):
            self.active_provider.shutdown()


# Global singleton instance
email_service = EmailService()

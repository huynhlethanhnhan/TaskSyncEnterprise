# 📂 FILE: app/services/email/__init__.py
from app.services.email.dto import EmailMessage, EmailResult
from app.services.email.smtp_client import SMTPConfig, SMTPClient, ConnectionManager
from app.services.email.provider import EmailProvider, SMTPProvider
from app.services.email.service import EmailService, email_service

__all__ = [
    "EmailMessage",
    "EmailResult",
    "SMTPConfig",
    "SMTPClient",
    "ConnectionManager",
    "EmailProvider",
    "SMTPProvider",
    "EmailService",
    "email_service",
]

# 📂 FILE: app/services/email/dto.py
from datetime import datetime, timezone
from typing import List, Optional, Any
from pydantic import BaseModel, Field, EmailStr


class EmailMessage(BaseModel):
    """Data Transfer Object representing an email communication message."""
    sender_name: Optional[str] = Field(None, description="Display name of the email sender")
    sender_address: Optional[EmailStr] = Field(None, description="Source sender email address")
    recipients: List[EmailStr] = Field(..., min_length=1, description="Primary recipient email addresses")
    cc: List[EmailStr] = Field(default_factory=list, description="Carbon Copy recipient email addresses")
    bcc: List[EmailStr] = Field(default_factory=list, description="Blind Carbon Copy recipient email addresses")
    reply_to: Optional[EmailStr] = Field(None, description="Direct reply-to target email address")
    subject: str = Field(..., description="Subject heading of the email")
    body_text: Optional[str] = Field(None, description="Plain-text body string")
    body_html: Optional[str] = Field(None, description="HTML formatted email body string")
    attachments: List[Any] = Field(default_factory=list, description="Placeholder interface for future file attachments")


class EmailResult(BaseModel):
    """Data Transfer Object containing delivery dispatch results for auditing."""
    success: bool = Field(..., description="Flag specifying if email was sent successfully")
    provider: str = Field(..., description="Name of active provider strategy used")
    retry_count: int = Field(default=0, description="Number of retry attempts executed")
    duration_ms: int = Field(default=0, description="Duration of delivery operation in milliseconds")
    provider_response: Optional[str] = Field(None, description="Standard response message or status code from gateway")
    failure_reason: Optional[str] = Field(None, description="Error message trace if delivery failed")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), description="UTC completion timestamp")

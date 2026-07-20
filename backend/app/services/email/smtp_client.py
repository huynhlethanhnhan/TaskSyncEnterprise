# 📂 FILE: app/services/email/smtp_client.py
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List
from pydantic import BaseModel, SecretStr, Field
from app.core.logger import app_logger


class SMTPConfig(BaseModel):
    """Configuration schema for SMTP server connection parameters."""

    host: str = Field(..., description="SMTP server hostname")
    port: int = Field(..., description="SMTP server port number")
    username: Optional[str] = Field(None, description="Authentication username")
    password: Optional[SecretStr] = Field(
        None, description="Authentication secret password"
    )
    use_tls: bool = Field(default=True, description="Enables TLS encapsulation")
    use_ssl: bool = Field(default=False, description="Enables SSL connection wrapping")
    timeout: int = Field(default=10, description="Network timeout limit in seconds")


class ConnectionManager:
    """Thread-safe connection manager managing thread-local SMTP sessions caching."""

    def __init__(self, config: SMTPConfig) -> None:
        self.config = config
        self._local = threading.local()

    def get_connection(self) -> smtplib.SMTP:
        """Retrieves active thread-local SMTP session or establishes a new one."""
        conn = getattr(self._local, "connection", None)
        if conn is not None:
            try:
                # Issue NOOP to check if connection remains open
                status, _ = conn.noop()
                if status == 250:
                    return conn
            except Exception:
                app_logger.warning(
                    "Cached SMTP connection has disconnected or timed out. Reconnecting..."
                )
                try:
                    conn.close()
                except Exception:
                    pass

        conn = self._create_connection()
        self._local.connection = conn
        return conn

    def _create_connection(self) -> smtplib.SMTP:
        """Establishes connection and handles authentication."""
        app_logger.info(
            f"Connecting to SMTP server at {self.config.host}:{self.config.port}"
        )

        if self.config.use_ssl:
            conn = smtplib.SMTP_SSL(
                host=self.config.host,
                port=self.config.port,
                timeout=self.config.timeout,
            )
        else:
            conn = smtplib.SMTP(
                host=self.config.host,
                port=self.config.port,
                timeout=self.config.timeout,
            )

        if self.config.use_tls and not self.config.use_ssl:
            conn.starttls()

        if self.config.username and self.config.password:
            password_str = self.config.password.get_secret_value()
            conn.login(self.config.username, password_str)

        return conn

    def close_connection(self) -> None:
        """Gracefully closes SMTP connection for the current thread."""
        conn = getattr(self._local, "connection", None)
        if conn:
            try:
                conn.quit()
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass
            self._local.connection = None


class SMTPClient:
    """SMTP Client managing MIME building, connection retrieval, and message delivery."""

    def __init__(self, config: SMTPConfig) -> None:
        self.config = config
        self.manager = ConnectionManager(config)

    def send(
        self,
        sender_address: str,
        sender_name: str,
        recipients: List[str],
        cc: List[str],
        bcc: List[str],
        reply_to: Optional[str],
        subject: str,
        body_text: Optional[str],
        body_html: Optional[str],
    ) -> str:
        """Sends an assembled email over the managed connection."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{sender_name} <{sender_address}>"
        msg["To"] = ", ".join(recipients)

        if cc:
            msg["Cc"] = ", ".join(cc)
        if reply_to:
            msg["Reply-To"] = reply_to

        # Attach text & html parts
        if body_text:
            msg.attach(MIMEText(body_text, "plain", "utf-8"))
        if body_html:
            msg.attach(MIMEText(body_html, "html", "utf-8"))

        # Consolidate all envelopes
        all_recipients = list(recipients) + list(cc) + list(bcc)

        # Retrieve thread-local active connection
        conn = self.manager.get_connection()

        # Send envelope
        refused = conn.sendmail(sender_address, all_recipients, msg.as_string())
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)

        return "SMTP delivery successful"

    def shutdown(self) -> None:
        """Gracefully closes all cached SMTP connections."""
        self.manager.close_connection()

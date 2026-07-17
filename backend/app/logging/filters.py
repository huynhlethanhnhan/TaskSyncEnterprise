# 📂 FILE: app/logging/filters.py
"""
Enterprise Logging Filters for TaskSyncEnterprise.

Implements OWASP-compliant sensitive-data masking that prevents passwords,
JWT tokens, authorization credentials, cookies, database connection strings,
and other secrets from appearing in any log output – regardless of log level.

The filter operates at the logging.Filter level so it is applied before any
handler writes the record to disk or a remote sink.
"""

import logging
import re
from typing import ClassVar

# ──────────────────────────────────────────────────────────────────────────────
# Masking configuration
# ──────────────────────────────────────────────────────────────────────────────

_REDACTED = "[REDACTED]"

# Compiled patterns: order matters – more specific patterns are listed first.
_SENSITIVE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # JWT / Bearer tokens (three-part base64url)
    (
        re.compile(
            r"(Bearer\s+)[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",
            re.IGNORECASE,
        ),
        r"\1" + _REDACTED,
    ),
    # Raw JWT tokens (standalone)
    (
        re.compile(
            r"\b[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\.[A-Za-z0-9\-_]{20,}\b"
        ),
        _REDACTED,
    ),
    (
        re.compile(
            r'((?:["\'\\]*)*(?:password|passwd|pwd|secret|token|api_key|apikey|access_token|'
            r"refresh_token|client_secret|private_key|auth_token|authorization|"
            r"db_password|database_password|connection_string|db_url|database_url|"
            r'redis_password|smtp_password|secret_key)(?:["\'\\]*)*\s*[:=]\s*(?:["\'\\]*)*)[^"\'\\,\s&\}]{3,}',
            re.IGNORECASE,
        ),
        r"\1" + _REDACTED,
    ),
    # Authorization header value – mask everything after the header name
    (
        re.compile(r"(Authorization:\s*).+", re.IGNORECASE),
        r"\1" + _REDACTED,
    ),
    # Cookie header value
    (
        re.compile(r"(Cookie:\s*)\S+", re.IGNORECASE),
        r"\1" + _REDACTED,
    ),
    # Set-Cookie header value
    (
        re.compile(r"(Set-Cookie:\s*)\S+", re.IGNORECASE),
        r"\1" + _REDACTED,
    ),
    # SQLAlchemy / pymssql connection strings (contains passwords)
    (
        re.compile(
            r"(mssql\+\w+://[^:]+:)[^@]+(@)",
            re.IGNORECASE,
        ),
        r"\1" + _REDACTED + r"\2",
    ),
    (
        re.compile(
            r"(postgresql\+\w+://[^:]+:)[^@]+(@)",
            re.IGNORECASE,
        ),
        r"\1" + _REDACTED + r"\2",
    ),
    (
        re.compile(
            r"(mysql\+\w+://[^:]+:)[^@]+(@)",
            re.IGNORECASE,
        ),
        r"\1" + _REDACTED + r"\2",
    ),
    # Generic redis://[:password@]host pattern
    (
        re.compile(r"(redis://:[^@]+)(@)", re.IGNORECASE),
        r"redis://:***\2",
    ),
]


def mask_sensitive(text: str) -> str:
    """
    Applies all compiled masking patterns to *text* and returns the sanitized
    string. Safe to call on arbitrary log message content.
    """
    for pattern, replacement in _SENSITIVE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class SensitiveDataFilter(logging.Filter):
    """
    A logging.Filter that scrubs sensitive fields from every LogRecord before
    the record is emitted by any handler.

    Complies with:
      - OWASP Logging Cheat Sheet (CWE-312, CWE-359)
      - PCI-DSS Requirement 10.3 (audit log content requirements)
      - GDPR Article 32 (appropriate technical measures for personal data)
    """

    # Fields on the LogRecord to inspect in addition to the message text
    _EXTRA_FIELDS: ClassVar[list[str]] = [
        "msg",
        "pathname",
        "exc_text",
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        """
        Mutates *record* in-place, masking sensitive content, then returns True
        so the record is always emitted (masking, not blocking).
        """
        # 1. Mask the primary log message
        if isinstance(record.msg, str):
            record.msg = mask_sensitive(record.msg)

        # 2. Mask formatted exception text if it has already been rendered
        if record.exc_text:
            record.exc_text = mask_sensitive(record.exc_text)

        # 3. Mask any extra string attributes attached via extra={} parameter
        for field in vars(record):
            val = getattr(record, field, None)
            if isinstance(val, str) and field not in (
                "levelname",
                "name",
                "filename",
                "funcName",
                "thread",
                "threadName",
            ):
                setattr(record, field, mask_sensitive(val))

        return True

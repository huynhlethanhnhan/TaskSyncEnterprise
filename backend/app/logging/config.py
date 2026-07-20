# 📂 FILE: app/logging/config.py
"""
Centralized Logging Configuration Factory for TaskSyncEnterprise.

Provides factory functions that build log handlers, formatters, and filters
configured for environment-specific behavior (JSON in production, pretty-print
in development). Compatible with:
  - Grafana Loki
  - ELK Stack (Elasticsearch / Logstash / Kibana)
  - Datadog
  - Splunk
  - OpenTelemetry Log Bridge
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Literal

LogLevelType = Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

# ──────────────────────────────────────────────────────────────────────────────
# Default sentinel – used when context var has not been populated yet
# ──────────────────────────────────────────────────────────────────────────────
EMPTY = "-"


def _resolve_numeric_level(level: str) -> int:
    """Convert a string log-level name to the numeric logging constant."""
    return getattr(logging, level.upper(), logging.INFO)


def build_json_formatter() -> "logging.Formatter":
    """
    Returns a StructuredFormatter configured for machine-readable JSON output.
    Used in production and for all file handlers.
    """
    from app.logging.formatter import StructuredFormatter

    return StructuredFormatter(use_json=True)


def build_pretty_formatter(fmt: str | None = None) -> "logging.Formatter":
    """
    Returns a StructuredFormatter configured for human-readable colored console
    output. Used in development / local environment only.
    """
    from app.logging.formatter import StructuredFormatter

    if fmt and fmt.lower() == "json":
        fmt = None
    return StructuredFormatter(fmt=fmt, use_json=False)


def build_sensitive_filter() -> "logging.Filter":
    """Returns a SensitiveDataFilter that masks secrets before emission."""
    from app.logging.filters import SensitiveDataFilter

    return SensitiveDataFilter()


def build_console_handler(
    level: str,
    use_json: bool,
    fmt: str | None = None,
) -> logging.StreamHandler:
    """
    Constructs a console (stdout) StreamHandler with the appropriate formatter
    and sensitive-data filter pre-attached.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(_resolve_numeric_level(level))
    handler.addFilter(build_sensitive_filter())
    handler.setFormatter(
        build_json_formatter() if use_json else build_pretty_formatter(fmt)
    )
    return handler


def build_rotating_file_handler(
    file_path: Path,
    level: str,
    max_bytes: int,
    backup_count: int,
) -> RotatingFileHandler:
    """
    Constructs a RotatingFileHandler that always emits JSON, regardless of
    environment, to guarantee machine-readable log files for ingestion by
    Loki / ELK / Datadog / Splunk.
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(
        filename=str(file_path),
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
        delay=True,  # Defer file creation until first write – avoids empty files on startup
    )
    handler.setLevel(_resolve_numeric_level(level))
    handler.addFilter(build_sensitive_filter())
    handler.setFormatter(build_json_formatter())
    return handler


def configure_third_party_loggers(level: str) -> None:
    """
    Silences or re-routes noisy third-party loggers (uvicorn, sqlalchemy, etc.)
    through the root logger at appropriate levels to avoid log pollution.
    """
    # Propagate uvicorn messages through our root logger
    for name in ("uvicorn", "uvicorn.error", "fastapi"):
        lgr = logging.getLogger(name)
        lgr.handlers.clear()
        lgr.propagate = True

    # Suppress uvicorn access logs – replaced by our StructuredLoggingMiddleware
    uv_access = logging.getLogger("uvicorn.access")
    uv_access.handlers.clear()
    uv_access.propagate = False
    uv_access.setLevel(logging.CRITICAL)

    # Keep SQLAlchemy at WARNING unless the caller explicitly enables SQL_ECHO
    sa_logger = logging.getLogger("sqlalchemy.engine")
    sa_logger.setLevel(logging.WARNING)

    # Suppress noisy httpx/httpcore debug traffic
    for name in ("httpx", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)

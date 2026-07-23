# 📂 FILE: app/logging/formatter.py
"""
Structured Log Formatter for TaskSyncEnterprise.

Emits every log record as a machine-readable JSON object compatible with:
  - Grafana Loki (logfmt / JSON)
  - ELK Stack (Elasticsearch JSON ingestion)
  - Datadog (JSON log format)
  - Splunk (JSON sourcetype)
  - OpenTelemetry Log Data Model

In development mode (use_json=False) it emits a human-readable, colored text
line to improve developer experience without sacrificing context richness.

JSON Schema (every field is always present – absent values use null / "-"):
{
  "timestamp":      "<ISO-8601 UTC>",
  "level":          "INFO | WARNING | ...",
  "service_name":   "TaskSyncEnterprise",
  "environment":    "production | development | testing",
  "version":        "1.0.0",
  "logger":         "<logging.getLogger name>",
  "module":         "<python module name>",
  "function":       "<function name>",
  "line":           <line number>,
  "request_id":     "<uuid4 | ->",
  "correlation_id": "<uuid4 | ->",
  "trace_id":       "<hex | null>",
  "span_id":        "<hex | null>",
  "client_ip":      "<ip | null>",
  "method":         "<GET|POST|... | null>",
  "path":           "</path | null>",
  "status_code":    <int | null>,
  "duration_ms":    <float | null>,
  "user_id":        "<id | null>",
  "tenant_id":      "<id | null>",
  "project_id":     "<id | null>",
  "user_agent":     "<ua | null>",
  "error_code":     "<code | null>",
  "message":        "<rendered log message>",
  "exception":      "<traceback | null>"
}
"""

import json
import logging
import traceback
from datetime import datetime, timezone
from typing import Any

# ──────────────────────────────────────────────────────────────────────────────
# ANSI colour codes for development console output
# ──────────────────────────────────────────────────────────────────────────────
_RESET = "\033[0m"
_BOLD = "\033[1m"
_LEVEL_COLOURS = {
    "DEBUG": "\033[36m",  # Cyan
    "INFO": "\033[32m",  # Green
    "WARNING": "\033[33m",  # Yellow
    "ERROR": "\033[31m",  # Red
    "CRITICAL": "\033[35m",  # Magenta
}


def _null_if_empty(value: Any, sentinel: str = "-") -> Any:
    """Return None when value equals the sentinel placeholder, otherwise return value."""
    if value == sentinel or value == "" or value is None:
        return None
    return value


class StructuredFormatter(logging.Formatter):
    """
    Drop-in replacement for logging.Formatter that produces either:
      - Structured JSON (production / file handlers)
      - Coloured human-readable text (development console)

    The formatter reads observability context (request_id, correlation_id,
    trace_id, …) from the logging context module on every call, guaranteeing
    that context is fresh even in async workloads.
    """

    def __init__(self, fmt: str | None = None, use_json: bool = True) -> None:
        super().__init__(fmt)
        self.use_json = use_json
        # Lazy-import settings to avoid circular imports at module load time
        self._service_name: str | None = None
        self._environment: str | None = None
        self._version: str = "1.0.0"

    # ──────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────────

    def _load_settings(self) -> None:
        if self._service_name is None:
            try:
                from app.config import settings

                self._service_name = settings.APP_NAME
                self._environment = settings.ENVIRONMENT
            except Exception:
                self._service_name = "TaskSyncEnterprise"
                self._environment = "unknown"

    def _get_context(self) -> dict[str, Any]:
        try:
            from app.logging.context import get_log_context

            return get_log_context()
        except Exception:
            return {}

    def _format_exception(self, record: logging.LogRecord) -> str | None:
        """Render exception as string but NEVER expose stack trace to clients."""
        if record.exc_info:
            try:
                lines = traceback.format_exception(*record.exc_info)
                return "".join(lines).strip()
            except Exception:
                return str(record.exc_info[1])
        if record.exc_text:
            return record.exc_text
        return None

    # ──────────────────────────────────────────────────────────────────────
    # Public format() entry point
    # ──────────────────────────────────────────────────────────────────────

    def format(self, record: logging.LogRecord) -> str:
        self._load_settings()
        ctx = self._get_context()

        # Inject context fields onto the record so other formatters / filters
        # that may have a reference to this record also see them.
        record.request_id = ctx.get("request_id", "-")
        record.correlation_id = ctx.get("correlation_id", "-")
        record.trace_id = ctx.get("trace_id")
        record.span_id = ctx.get("span_id")
        record.client_ip = ctx.get("client_ip", "-")
        record.method = ctx.get("method", "-")
        record.path = ctx.get("path", "-")
        record.user_id = ctx.get("user_id", "-")
        record.user_agent = ctx.get("user_agent", "-")
        record.tenant_id = ctx.get("tenant_id")
        record.project_id = ctx.get("project_id")
        record.error_code = ctx.get("error_code", "-")

        # duration_ms – prefer explicitly passed extra value, then context
        record.duration_ms = getattr(record, "duration_ms", None) or ctx.get(
            "duration_ms", 0.0
        )

        # status_code – may be passed via extra={"status_code": …}
        record.status_code = getattr(record, "status_code", None)

        if self.use_json:
            return self._format_json(record)
        return self._format_pretty(record)

    # ──────────────────────────────────────────────────────────────────────
    # JSON output
    # ──────────────────────────────────────────────────────────────────────

    def _format_json(self, record: logging.LogRecord) -> str:
        exception_text = self._format_exception(record)

        log_entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "service_name": self._service_name,
            "environment": self._environment,
            "version": self._version,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "request_id": record.request_id,
            "correlation_id": record.correlation_id,
            "trace_id": record.trace_id,
            "span_id": record.span_id,
            "client_ip": _null_if_empty(record.client_ip),
            "method": _null_if_empty(record.method),
            "path": _null_if_empty(record.path),
            "status_code": record.status_code,
            "duration_ms": round(record.duration_ms, 3) if record.duration_ms else None,
            "user_id": _null_if_empty(record.user_id),
            "tenant_id": record.tenant_id,
            "project_id": record.project_id,
            "user_agent": _null_if_empty(record.user_agent),
            "error_code": _null_if_empty(record.error_code),
            "message": record.getMessage(),
            "exception": exception_text,
        }

        # Suppress exc_info to prevent double-printing in the default handler
        record.exc_info = None
        record.exc_text = None

        return json.dumps(log_entry, ensure_ascii=False, default=str)

    # ──────────────────────────────────────────────────────────────────────
    # Pretty (development console) output
    # ──────────────────────────────────────────────────────────────────────

    def _format_pretty(self, record: logging.LogRecord) -> str:
        colour = _LEVEL_COLOURS.get(record.levelname, "")
        ts = datetime.fromtimestamp(record.created, timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S.%f"
        )[:-3]
        level_tag = f"{colour}{_BOLD}[{record.levelname:<8}]{_RESET}"

        rid = record.request_id if record.request_id != "-" else ""
        rid_tag = f" \033[2m[{rid[:8]}]\033[0m" if rid else ""

        path_tag = ""
        if record.method != "-" and record.path != "-":
            status = f" {record.status_code}" if record.status_code else ""
            path_tag = f" \033[90m{record.method} {record.path}{status}\033[0m"

        duration_tag = ""
        if record.duration_ms and record.duration_ms > 0:
            duration_tag = f" \033[2m{record.duration_ms:.1f}ms\033[0m"

        msg = record.getMessage()
        exception_text = self._format_exception(record)
        record.exc_info = None
        record.exc_text = None

        line = f"{ts} {level_tag}{rid_tag}{path_tag}{duration_tag}  {msg}"
        if exception_text:
            line += f"\n\033[31m{exception_text}\033[0m"
        return line

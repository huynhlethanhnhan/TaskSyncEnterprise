# 📂 FILE: app/logging/context.py
"""
Request-Scoped Logging Context for TaskSyncEnterprise.

Provides a unified interface for reading and writing per-request context values
that are injected into every structured log record.  Context variables are
stored in Python's contextvars mechanism (PEP 567), making them naturally safe
for async / concurrent requests.

Fields provided:
  - request_id     : internal UUID generated per request
  - correlation_id : X-Correlation-ID header value (propagated from caller)
  - trace_id       : OpenTelemetry trace ID (null when OTel not installed)
  - span_id        : OpenTelemetry span ID  (null when OTel not installed)
  - user_id        : authenticated user identifier (JWT subject)
  - tenant_id      : tenant / organisation identifier
  - project_id     : active project context
  - client_ip      : originating client IP
  - method         : HTTP method
  - path           : HTTP request path
  - user_agent     : User-Agent header value
  - duration_ms    : request duration in milliseconds (set post-response)
"""
import contextvars
from typing import Any

from app.core.request_context import get_request_context, get_request_id

# ──────────────────────────────────────────────────────────────────────────────
# Context variables for observability identifiers not tracked in core
# ──────────────────────────────────────────────────────────────────────────────
correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="-"
)
trace_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "trace_id", default=None
)
span_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "span_id", default=None
)
tenant_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "tenant_id", default=None
)
project_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "project_id", default=None
)

# ──────────────────────────────────────────────────────────────────────────────
# Public helpers – set context values
# ──────────────────────────────────────────────────────────────────────────────

def set_correlation_id(value: str) -> contextvars.Token:
    return correlation_id_ctx.set(value)


def set_trace_id(value: str | None) -> contextvars.Token:
    return trace_id_ctx.set(value)


def set_span_id(value: str | None) -> contextvars.Token:
    return span_id_ctx.set(value)


def set_user_id(value: str | None) -> None:
    """Attach the authenticated user ID to the current request context dict."""
    ctx = get_request_context()
    if ctx:
        ctx["user_id"] = value or "-"


def set_tenant_id(value: str | None) -> contextvars.Token:
    return tenant_id_ctx.set(value)


def set_project_id(value: str | None) -> contextvars.Token:
    return project_id_ctx.set(value)


# ──────────────────────────────────────────────────────────────────────────────
# Public helpers – read context values
# ──────────────────────────────────────────────────────────────────────────────

def get_correlation_id() -> str:
    return correlation_id_ctx.get()


def get_trace_id() -> str | None:
    """
    Returns the active OpenTelemetry trace ID if available.
    Attempts to read it from the OTel context first; falls back to the
    contextvars store so tests can inject synthetic IDs without installing OTel.
    """
    # Optional OTel integration (no hard dependency)
    try:
        from opentelemetry import trace as otel_trace  # type: ignore[import]
        span = otel_trace.get_current_span()
        ctx = span.get_span_context()
        if ctx and ctx.is_valid:
            return format(ctx.trace_id, "032x")
    except Exception:
        pass
    return trace_id_ctx.get()


def get_span_id() -> str | None:
    """
    Returns the active OpenTelemetry span ID if available.
    Falls back to the contextvars store.
    """
    try:
        from opentelemetry import trace as otel_trace  # type: ignore[import]
        span = otel_trace.get_current_span()
        ctx = span.get_span_context()
        if ctx and ctx.is_valid:
            return format(ctx.span_id, "016x")
    except Exception:
        pass
    return span_id_ctx.get()


def get_tenant_id() -> str | None:
    return tenant_id_ctx.get()


def get_project_id() -> str | None:
    return project_id_ctx.get()


# ──────────────────────────────────────────────────────────────────────────────
# Aggregated context snapshot consumed by the formatter
# ──────────────────────────────────────────────────────────────────────────────

def get_log_context() -> dict[str, Any]:
    """
    Returns a complete snapshot of the current request-scoped observability
    context.  This is the single source-of-truth consumed by StructuredFormatter.
    """
    core_ctx = get_request_context()
    return {
        "request_id": core_ctx.get("request_id", get_request_id()),
        "correlation_id": core_ctx.get("correlation_id", get_correlation_id()),
        "trace_id": get_trace_id(),
        "span_id": get_span_id(),
        "method": core_ctx.get("method", "-"),
        "path": core_ctx.get("path", "-"),
        "client_ip": core_ctx.get("client_ip", "-"),
        "user_id": core_ctx.get("user_id", "-"),
        "user_agent": core_ctx.get("user_agent", "-"),
        "duration": core_ctx.get("duration", 0.0),
        "duration_ms": core_ctx.get("duration_ms", 0.0),
        "error_code": core_ctx.get("error_code", "-"),
        "tenant_id": core_ctx.get("tenant_id", get_tenant_id()),
        "project_id": core_ctx.get("project_id", get_project_id()),
    }

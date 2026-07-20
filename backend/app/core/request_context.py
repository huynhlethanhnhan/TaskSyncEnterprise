# 📂 FILE: app/core/request_context.py
"""
Request-Scoped Context Variables for TaskSyncEnterprise.

Provides the authoritative store for all per-request observability fields.
Uses Python's contextvars mechanism (PEP 567), which is natively safe for
async/concurrent workloads – each coroutine / request gets its own copy.

Context fields:
  request_id      – internal UUID generated per request
  correlation_id  – caller-supplied X-Correlation-ID (or generated UUID)
  trace_id        – OpenTelemetry trace ID (null when OTel not installed)
  span_id         – OpenTelemetry span ID  (null when OTel not installed)
  method          – HTTP method
  path            – URL path
  client_ip       – originating client IP
  user_agent      – User-Agent header value
  user_id         – authenticated user identifier (JWT sub)
  tenant_id       – tenant / organisation context
  project_id      – active project context
  start_time      – request start time (float, time.time())
  duration        – request duration in seconds (set post-response)
  duration_ms     – request duration in milliseconds (set post-response)
  error_code      – application error code populated by exception handlers
"""

import contextvars
from typing import Any, Dict

# ──────────────────────────────────────────────────────────────────────────────
# Primary context dict – holds ALL request-scoped metadata as a mutable dict.
# Mutable so that downstream code (e.g. exception handlers) can enrich it.
# ──────────────────────────────────────────────────────────────────────────────
_request_context: contextvars.ContextVar[Dict[str, Any]] = contextvars.ContextVar(
    "request_context", default={}
)

# Backward-compatible scalar request_id for code that imports it directly
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="-"
)

# Correlation ID – exposed as a scalar for convenience
correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="-"
)


# ──────────────────────────────────────────────────────────────────────────────
# Context dict accessors
# ──────────────────────────────────────────────────────────────────────────────


def get_request_context() -> Dict[str, Any]:
    """Retrieves the full request context dictionary for the current scope."""
    return _request_context.get()


def set_request_context(context: Dict[str, Any]) -> contextvars.Token:
    """Replaces the entire request context dictionary."""
    return _request_context.set(context)


def reset_request_context(token: contextvars.Token) -> None:
    """Resets the request context dictionary to its previous state."""
    _request_context.reset(token)


# ──────────────────────────────────────────────────────────────────────────────
# Scalar convenience accessors
# ──────────────────────────────────────────────────────────────────────────────


def get_request_id() -> str:
    """Returns only the request_id string from the context."""
    return request_id_ctx.get()


def get_correlation_id() -> str:
    """Returns only the correlation_id string from the context."""
    ctx = _request_context.get()
    return ctx.get("correlation_id", correlation_id_ctx.get())

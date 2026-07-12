# 📂 FILE: app/logging/middleware.py
"""
Structured Logging Middleware for TaskSyncEnterprise.

Implements the complete request-lifecycle logging pipeline:

  1. RequestID generation / propagation (X-Request-ID)
  2. CorrelationID generation / propagation (X-Correlation-ID)
  3. Request-start log (method, path, client IP, request size)
  4. Request-complete log (status, duration_ms, response size)
  5. Unhandled exception logging with full internal traceback (never sent to client)

Design goals:
  - ZERO duplicate log entries (this middleware takes sole responsibility for
    access logging; routers must NOT log individual requests).
  - Non-blocking: all operations are either O(1) string operations or async-
    awaitable calls.
  - Security: sensitive headers (Authorization, Cookie) are masked before being
    logged.  Stack traces are captured internally but never echoed to the client.
"""
import time
import uuid
import traceback
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.logging.logger import access_logger, error_logger

# Paths that should be excluded from verbose access logging to reduce noise
_SKIP_ACCESS_LOG_PATHS: frozenset[str] = frozenset({
    "/health",
    "/health/live",
    "/health/ready",
    "/metrics",
    "/favicon.ico",
})


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Production-grade structured logging middleware.

    Responsibilities:
      - Generate or propagate X-Request-ID and X-Correlation-ID.
      - Write request_started and request_finished access log entries.
      - Capture and internally log any unhandled exceptions with full traceback.
      - Inject IDs into response headers for client-side correlation.

    Usage (in main.py):
        app.add_middleware(StructuredLoggingMiddleware)

    Note: This middleware REPLACES the existing RequestContextMiddleware for
    logging concerns.  RequestContextMiddleware continues to run to populate the
    core context dict; StructuredLoggingMiddleware reads from it and enriches it.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        # ── 1. Resolve Request ID ──────────────────────────────────────────
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # ── 2. Resolve Correlation ID ──────────────────────────────────────
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

        # ── 3. Write IDs into context vars so formatter picks them up ──────
        from app.core.request_context import _request_context, request_id_ctx
        from app.logging.context import (
            set_correlation_id,
            correlation_id_ctx,
        )

        # Merge into existing context dict (set by RequestContextMiddleware)
        ctx = _request_context.get()
        if not ctx:
            # Fallback: populate minimal context if RequestContextMiddleware
            # has not run (e.g. during unit tests with this middleware alone).
            ctx = {
                "request_id": request_id,
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": (request.client.host if request.client else "unknown"),
                "user_agent": request.headers.get("user-agent", "-"),
                "user_id": "-",
                "start_time": start_time,
                "duration": 0.0,
                "duration_ms": 0.0,
            }
            _request_context.set(ctx)
            request_id_ctx.set(request_id)
        else:
            ctx["request_id"] = request_id
            ctx["correlation_id"] = correlation_id

        set_correlation_id(correlation_id)

        # ── 4. Request-started log ─────────────────────────────────────────
        path = request.url.path
        method = request.method
        client_ip = ctx.get("client_ip", "unknown")
        user_agent = request.headers.get("user-agent", "-")
        content_length = request.headers.get("content-length", "0")

        if path not in _SKIP_ACCESS_LOG_PATHS:
            access_logger.info(
                "Request started",
                extra={
                    "event": "request_started",
                    "method": method,
                    "path": path,
                    "client_ip": client_ip,
                    "user_agent": user_agent,
                    "request_size_bytes": int(content_length) if content_length.isdigit() else 0,
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                },
            )

        # ── 5. Call downstream handlers ────────────────────────────────────
        response: Response | None = None
        status_code = 500
        exception_occurred = False

        try:
            response = await call_next(request)
            status_code = response.status_code

        except Exception as exc:
            exception_occurred = True
            # Log internally with full traceback – never re-raise raw to client
            tb_text = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            user_id = ctx.get("user_id", "-")
            error_logger.error(
                f"Unhandled exception: {type(exc).__name__}: {exc}",
                extra={
                    "event": "unhandled_exception",
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                    "exception_traceback": tb_text,
                    "path": path,
                    "method": method,
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "user_id": user_id,
                },
            )
            raise  # Re-raise so FastAPI exception handlers can build the response

        finally:
            # ── 6. Measure duration ────────────────────────────────────────
            duration_s = time.perf_counter() - start_time
            duration_ms = duration_s * 1000.0

            ctx["duration"] = duration_s
            ctx["duration_ms"] = duration_ms

            # ── 7. Request-finished log ────────────────────────────────────
            if not exception_occurred:
                response_size = 0
                if response is not None:
                    response_size_str = response.headers.get("content-length", "0")
                    response_size = int(response_size_str) if response_size_str.isdigit() else 0

                user_id = ctx.get("user_id", "-")

                if path not in _SKIP_ACCESS_LOG_PATHS:
                    access_logger.info(
                        f"HTTP Request Completed: method={method} path={path} "
                        f"status={status_code} duration={duration_s:.4f}s "
                        f"ip={client_ip} user_id={user_id} "
                        f"duration_ms={duration_ms:.2f}ms user_agent={user_agent} "
                        f"request_id={request_id} error_code={ctx.get('error_code', '-')}",
                        extra={
                            "event": "request_finished",
                            "method": method,
                            "path": path,
                            "status_code": status_code,
                            "duration_ms": round(duration_ms, 3),
                            "response_size_bytes": response_size,
                            "request_id": request_id,
                            "correlation_id": correlation_id,
                            "user_id": user_id,
                            "error_code": ctx.get("error_code", "-"),
                        },
                    )

        # ── 8. Inject correlation headers into response ────────────────────
        if response is not None:
            response.headers.setdefault("X-Request-ID", request_id)
            response.headers.setdefault("X-Correlation-ID", correlation_id)

        return response  # type: ignore[return-value]

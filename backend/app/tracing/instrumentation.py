# 📂 FILE: app/tracing/instrumentation.py
"""
Phase 3.7.4 – OpenTelemetry Auto-Instrumentation Registry.

Responsibilities:
  1. Instrument FastAPI (all routes, excludes health/metrics/docs by URL filter).
  2. Instrument SQLAlchemy engine (auto-spans on every SQL query).
  3. Instrument redis-py client (auto-spans on every Redis command).
  4. Instrument httpx (auto-spans on every outbound HTTP call).
  5. Expose get_tracer() factory for manual instrumentation inside business logic.

All instrumentors are guarded by settings.ENABLE_TRACING and are idempotent
(safe to call multiple times).

Design Decisions
----------------
- FastAPI instrumentation uses a URL filter predicate (not path exclusion middleware)
  to avoid modifying the middleware stack ordering.
- SQLAlchemy instrumentation hooks into the existing engine singleton.
- Redis instrumentation hooks into redis-py at the library level, so it covers
  both the InstrumentedRedis subclass and any direct redis.Redis usage.
- httpx instrumentation is applied globally (covers both sync and async clients).
"""
from __future__ import annotations

import logging

from opentelemetry import trace

from app.config import settings

logger = logging.getLogger("app.tracing")

# Module-level state
_fastapi_instrumented: bool = False
_sqlalchemy_instrumented: bool = False
_redis_instrumented: bool = False
_httpx_instrumented: bool = False


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def get_tracer(name: str = "app") -> trace.Tracer:
    """
    Return a named tracer from the global TracerProvider.

    Parameters
    ----------
    name : str
        Logical name for this tracer (e.g. 'app.services.tasks').
        Appears in span attributes as `instrumentation.name`.

    Returns
    -------
    opentelemetry.trace.Tracer
        The tracer. When tracing is disabled this returns a NoOp tracer.
    """
    return trace.get_tracer(name)


def instrument_app(app) -> None:
    """
    Apply all OTel auto-instrumentors to the FastAPI application.

    Must be called AFTER FastAPI app is created but BEFORE the first request.
    Safe to call multiple times – each instrumentor is idempotent.

    Parameters
    ----------
    app : fastapi.FastAPI
        The FastAPI application instance.
    """
    if not settings.ENABLE_TRACING:
        logger.debug("Tracing disabled – skipping instrumentation.")
        return

    _instrument_fastapi(app)
    _instrument_sqlalchemy()
    _instrument_redis()
    _instrument_httpx()

    logger.info("OpenTelemetry auto-instrumentation complete.")


# ──────────────────────────────────────────────────────────────────────────────
# Private instrumentors
# ──────────────────────────────────────────────────────────────────────────────

def _build_excluded_urls_string() -> str:
    """Return URL regexes accepted by FastAPIInstrumentor's excluded_urls API."""
    patterns = []
    for path in settings.OTEL_EXCLUDED_PATHS:
        normalized = path.strip("/")
        if normalized:
            patterns.append(rf"(?:^|.*/){normalized}/?(?:\?.*)?$")
        else:
            patterns.append(r"(?:^|.*/)?(?:\?.*)?$")
    return ",".join(patterns)


def _instrument_fastapi(app) -> None:
    """Attach FastAPIInstrumentor to the application."""
    global _fastapi_instrumented
    if _fastapi_instrumented:
        return

    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        excluded_urls = _build_excluded_urls_string()

        FastAPIInstrumentor.instrument_app(
            app,
            excluded_urls=excluded_urls,
            tracer_provider=trace.get_tracer_provider(),
            http_capture_headers_server_request=[
                "x-request-id",
                "x-correlation-id",
                "user-agent",
            ],
            http_capture_headers_server_response=[
                "x-request-id",
                "x-correlation-id",
                "x-process-time",
            ],
        )
        _fastapi_instrumented = True
        logger.info(
            f"FastAPI instrumented. Excluded paths: {settings.OTEL_EXCLUDED_PATHS}"
        )
    except Exception as exc:
        logger.warning(f"FastAPI instrumentation failed (non-fatal): {exc}")


def _instrument_sqlalchemy() -> None:
    """Attach SQLAlchemyInstrumentor to the existing engine singleton."""
    global _sqlalchemy_instrumented
    if _sqlalchemy_instrumented:
        return

    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from app.database import engine

        SQLAlchemyInstrumentor().instrument(
            engine=engine,
            tracer_provider=trace.get_tracer_provider(),
            # Avoid propagating trace context into SQL text or query parameters.
            enable_commenter=False,
        )
        _sqlalchemy_instrumented = True
        logger.info("SQLAlchemy engine instrumented with OTel.")
    except Exception as exc:
        logger.warning(f"SQLAlchemy instrumentation failed (non-fatal): {exc}")


def _instrument_redis() -> None:
    """Attach RedisInstrumentor globally (covers all redis.Redis instances)."""
    global _redis_instrumented
    if _redis_instrumented:
        return

    try:
        from opentelemetry.instrumentation.redis import RedisInstrumentor

        RedisInstrumentor().instrument(
            tracer_provider=trace.get_tracer_provider(),
        )
        _redis_instrumented = True
        logger.info("Redis client instrumented with OTel.")
    except Exception as exc:
        logger.warning(f"Redis instrumentation failed (non-fatal): {exc}")


def _instrument_httpx() -> None:
    """Attach HTTPXClientInstrumentor globally (covers all httpx sync + async clients)."""
    global _httpx_instrumented
    if _httpx_instrumented:
        return

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument(
            tracer_provider=trace.get_tracer_provider(),
        )
        _httpx_instrumented = True
        logger.info("HTTPX client instrumented with OTel.")
    except Exception as exc:
        logger.warning(f"HTTPX instrumentation failed (non-fatal): {exc}")


def reset_instrumentation() -> None:
    """
    Uninstrument all libraries and reset module state.
    ONLY for use in tests – never call in production code.
    """
    global _fastapi_instrumented, _sqlalchemy_instrumented
    global _redis_instrumented, _httpx_instrumented

    if _fastapi_instrumented:
        try:
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
            FastAPIInstrumentor().uninstrument()
        except Exception:
            pass

    if _sqlalchemy_instrumented:
        try:
            from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
            SQLAlchemyInstrumentor().uninstrument()
        except Exception:
            pass

    if _redis_instrumented:
        try:
            from opentelemetry.instrumentation.redis import RedisInstrumentor
            RedisInstrumentor().uninstrument()
        except Exception:
            pass

    if _httpx_instrumented:
        try:
            from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
            HTTPXClientInstrumentor().uninstrument()
        except Exception:
            pass

    _fastapi_instrumented = False
    _sqlalchemy_instrumented = False
    _redis_instrumented = False
    _httpx_instrumented = False

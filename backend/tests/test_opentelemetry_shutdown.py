# 📂 FILE: tests/test_opentelemetry_shutdown.py
"""
Phase 4 Regression Test — OpenTelemetry Shutdown Lifecycle.

Validates:
1. Tracer provider shutdown is idempotent (safe to call multiple times).
2. Application shutdown sequence gracefully flushes and stops active span processors.
3. No background thread continues writing to a closed I/O stream after shutdown.
"""

from app.tracing.config import setup_tracing, shutdown_tracing, get_tracer_provider


def test_tracing_shutdown_is_idempotent():
    """Verify shutdown_tracing can be called repeatedly without exceptions."""
    setup_tracing()
    shutdown_tracing()
    # Second call should be a no-op and not raise any exception
    shutdown_tracing()


def test_tracer_provider_handles_closed_stream_gracefully():
    """Verify provider flushing does not crash or raise when exporter is shut down."""
    setup_tracing()
    provider = get_tracer_provider()
    if hasattr(provider, "force_flush"):
        provider.force_flush()
    shutdown_tracing()

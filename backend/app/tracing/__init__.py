# 📂 FILE: app/tracing/__init__.py
"""
Phase 3.7.4 – OpenTelemetry Distributed Tracing Module.

Public API for the TaskSyncEnterprise tracing subsystem.

Usage
-----
    # Called once at application startup (before FastAPI is created)
    from app.tracing import setup_tracing
    setup_tracing()

    # Called once after FastAPI app is created
    from app.tracing import instrument_app
    instrument_app(app)

    # Obtain a tracer for manual spans inside business logic
    from app.tracing import get_tracer
    tracer = get_tracer("app.services.tasks")
    with tracer.start_as_current_span("do_something"):
        ...
"""

from app.tracing.config import setup_tracing
from app.tracing.instrumentation import instrument_app, get_tracer

__all__ = [
    "setup_tracing",
    "instrument_app",
    "get_tracer",
]

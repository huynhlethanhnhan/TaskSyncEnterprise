# 📂 FILE: app/tracing/config.py
"""
Phase 3.7.4 – OpenTelemetry TracerProvider Configuration.

Responsibilities:
  1. Build a Resource with service.name, service.version, deployment.environment.
  2. Select and configure the correct SpanExporter based on settings.
  3. Register a BatchSpanProcessor (non-blocking, production-grade).
  4. Configure sampling via ParentBasedTraceIdRatio.
  5. Set the global TracerProvider so all instrumentation libraries pick it up.
  6. Instrument the Python logging module so every log record receives
     trace_id and span_id automatically.

Design Decisions
----------------
- Default exporter = ConsoleSpanExporter  (zero external dependencies in dev/CI)
- 'none' exporter = NoOpTracerProvider    (discards all spans, no overhead)
- BatchSpanProcessor is always used (never SyncSpanProcessor) to minimise latency.
- Sampling is applied BEFORE exporting so the overhead is purely proportional to
  the configured OTEL_SAMPLING_RATE.
"""

from __future__ import annotations

import logging
from urllib.parse import urlparse

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.trace.sampling import (
    ParentBasedTraceIdRatio,
    ALWAYS_ON,
    ALWAYS_OFF,
)
from opentelemetry.trace import NoOpTracerProvider

from app.config import settings
from app.logging.logger import app_logger

logger = logging.getLogger("app.tracing")

# Module-level flag – prevents duplicate initialisation
_tracing_initialised: bool = False
_tracing_shutdown: bool = False
_logging_bridge_initialised: bool = False


def _build_resource() -> Resource:
    """Builds the OTel Resource with service metadata."""
    return Resource.create(
        {
            SERVICE_NAME: settings.OTEL_SERVICE_NAME,
            SERVICE_VERSION: "1.0.0",
            "deployment.environment": settings.OTEL_ENVIRONMENT or settings.ENVIRONMENT,
            "service.namespace": "TaskSyncEnterprise",
            "telemetry.sdk.name": "opentelemetry",
            "telemetry.sdk.language": "python",
        }
    )


def _build_sampler(rate: float):
    """Returns the appropriate sampler for the given rate."""
    if rate <= 0.0:
        return ALWAYS_OFF
    if rate >= 1.0:
        return ALWAYS_ON
    return ParentBasedTraceIdRatio(rate)


def _build_exporter(exporter_type: str):
    """
    Instantiates the SpanExporter for the configured backend.

    Returns None when exporter_type == 'none' (signals NoOp mode).
    """
    match exporter_type:
        case "console":
            return ConsoleSpanExporter()

        case "otlp_grpc":
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter as GrpcOTLPExporter,
            )

            endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
            parsed = urlparse(endpoint) if "://" in endpoint else None
            if (
                settings.ENVIRONMENT == "production"
                and parsed
                and parsed.scheme == "http"
            ):
                raise ValueError(
                    "OTLP gRPC production endpoints must use TLS; configure a host:port or https URL."
                )
            grpc_endpoint = (parsed.netloc if parsed else endpoint).rstrip("/")
            if not grpc_endpoint:
                raise ValueError(
                    "OTEL_EXPORTER_OTLP_ENDPOINT must include a host for OTLP gRPC"
                )
            return GrpcOTLPExporter(
                endpoint=grpc_endpoint,
                insecure=settings.ENVIRONMENT != "production",
            )

        case "otlp_http":
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter as HttpOTLPExporter,
            )

            # HTTP endpoint convention adds /v1/traces suffix automatically
            http_endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
            if not http_endpoint.endswith("/v1/traces"):
                http_endpoint = http_endpoint.rstrip("/") + "/v1/traces"
            return HttpOTLPExporter(endpoint=http_endpoint)

        case "none":
            return None

        case _:
            app_logger.warning(
                f"Unknown OTEL_EXPORTER_TYPE '{exporter_type}', falling back to console."
            )
            return ConsoleSpanExporter()


def setup_tracing() -> None:
    """
    Initialise the global OpenTelemetry TracerProvider.

    Safe to call multiple times – idempotent after first call.
    Must be called BEFORE FastAPI app is created and BEFORE any
    instrumentation library calls.
    """
    global _tracing_initialised, _tracing_shutdown

    if _tracing_initialised:
        return

    _tracing_shutdown = False

    if not settings.ENABLE_TRACING:
        # Install a NoOp provider so all instrumentation code compiles
        # without errors but produces zero overhead.
        trace.set_tracer_provider(NoOpTracerProvider())
        app_logger.info(
            "OpenTelemetry tracing disabled (ENABLE_TRACING=False). "
            "NoOpTracerProvider installed."
        )
        _tracing_initialised = True
        return

    exporter_type = settings.OTEL_EXPORTER_TYPE
    exporter = _build_exporter(exporter_type)

    if exporter is None:
        # 'none' exporter requested – use NoOp but still mark as enabled
        # so instrumentation code path is exercised without overhead.
        trace.set_tracer_provider(NoOpTracerProvider())
        app_logger.info(
            "OpenTelemetry tracing enabled but exporter type is 'none'. "
            "Spans are discarded."
        )
        _tracing_initialised = True
        return

    resource = _build_resource()
    sampler = _build_sampler(settings.OTEL_SAMPLING_RATE)

    provider = TracerProvider(resource=resource, sampler=sampler)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Register as the global provider – all instrumentation libs use this
    trace.set_tracer_provider(provider)

    # Wire OTel trace_id / span_id into Python logging records
    _setup_logging_bridge()

    app_logger.info(
        f"OpenTelemetry tracing initialised. "
        f"service={settings.OTEL_SERVICE_NAME} "
        f"exporter={exporter_type} "
        f"sampling_rate={settings.OTEL_SAMPLING_RATE} "
        f"environment={settings.OTEL_ENVIRONMENT or settings.ENVIRONMENT}"
    )

    _tracing_initialised = True


def _setup_logging_bridge() -> None:
    """
    Activates the OTel Logging Instrumentor which injects
    otelTraceID and otelSpanID into every Python logging.LogRecord.

    The Phase 3.7.3 StructuredFormatter reads the active OTel span from
    app.logging.context. This bridge additionally enriches standard LogRecords
    without changing the existing formatter or middleware pipeline.
    """
    global _logging_bridge_initialised
    if _logging_bridge_initialised:
        return

    try:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)
        _logging_bridge_initialised = True
        logger.debug("OTel logging bridge activated.")
    except Exception as exc:  # pragma: no cover
        logger.warning(f"OTel logging bridge could not be activated: {exc}")


def get_tracer_provider() -> TracerProvider | NoOpTracerProvider:
    """Returns the currently registered global TracerProvider."""
    return trace.get_tracer_provider()


def reset_tracing() -> None:
    """
    Reset the global tracing state.
    ONLY for use in tests – never call in production code.
    """
    global _tracing_initialised, _tracing_shutdown, _logging_bridge_initialised
    _tracing_initialised = False
    _tracing_shutdown = False

    if _logging_bridge_initialised:
        try:
            from opentelemetry.instrumentation.logging import LoggingInstrumentor

            LoggingInstrumentor().uninstrument()
        except Exception:
            pass
        _logging_bridge_initialised = False

    try:
        from opentelemetry.util._once import Once

        provider = trace.get_tracer_provider()
        if isinstance(provider, TracerProvider):
            provider.shutdown()

        # Keep a NoOp provider visible between tests without consuming the
        # API's one-time registration guard needed by the next setup call.
        trace._TRACER_PROVIDER = NoOpTracerProvider()
        trace._TRACER_PROVIDER_SET_ONCE = Once()
    except Exception:
        pass


def shutdown_tracing() -> None:
    """Flush and stop the active SDK provider once during application shutdown."""
    global _tracing_shutdown
    if _tracing_shutdown:
        return

    provider = trace.get_tracer_provider()
    if isinstance(provider, TracerProvider):
        provider.force_flush()
        provider.shutdown()
    _tracing_shutdown = True

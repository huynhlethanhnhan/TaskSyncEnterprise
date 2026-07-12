# 📂 FILE: app/monitoring/redis_instrumentation.py
"""
Redis Instrumentation – Prometheus Metrics + OpenTelemetry Spans.

Phase 3.7.4 adds OTel span enrichment alongside the existing Prometheus metrics.
When ENABLE_TRACING=True the execute_command method:
  1. Records Prometheus request counter / duration / failure metrics (existing).
  2. Creates a child OTel span named "redis.<COMMAND>" with standard db.* attributes.

When ENABLE_TRACING=False the OTel span creation is completely skipped.

The OTel redis-py instrumentor (RedisInstrumentor) instruments at the redis-py
library level and covers ALL redis.Redis instances. InstrumentedRedis deliberately
sets its own span ONLY for the Prometheus wrapper layer so the two spans are
properly nested:

    redis.execute_command (OTel, from RedisInstrumentor)
        └─ redis.SET (OTel, from InstrumentedRedis)   ← enriched with extra attributes
"""
import time
import redis
from app.monitoring.prometheus_metrics import prometheus_metrics


class InstrumentedRedis(redis.Redis):
    """
    Subclass of redis.Redis that instruments commands with:
      - Prometheus metrics (requests, failures, latencies)
      - OpenTelemetry spans (when ENABLE_TRACING=True)
    """

    def execute_command(self, *args, **options):
        command = str(args[0]).upper() if args else "UNKNOWN"

        # ── Prometheus ─────────────────────────────────────────────────────
        prometheus_metrics.redis_requests_total.labels(command=command).inc()

        start_time = time.perf_counter()

        # ── OTel span (optional) ───────────────────────────────────────────
        otel_span = self._start_otel_span(command, args)

        try:
            result = super().execute_command(*args, **options)
            duration = time.perf_counter() - start_time

            prometheus_metrics.redis_query_duration.labels(command=command).observe(duration)

            if otel_span is not None:
                self._end_otel_span(otel_span, success=True, duration=duration)

            return result

        except Exception as exc:
            duration = time.perf_counter() - start_time
            err_type = type(exc).__name__

            prometheus_metrics.redis_failures_total.labels(
                command=command, error_type=err_type
            ).inc()
            prometheus_metrics.redis_query_duration.labels(command=command).observe(duration)

            if otel_span is not None:
                self._end_otel_span(otel_span, success=False, duration=duration, exc=exc)

            raise

    # ──────────────────────────────────────────────────────────────────────
    # OTel helpers (static – no instance state required)
    # ──────────────────────────────────────────────────────────────────────

    @staticmethod
    def _start_otel_span(command: str, args: tuple):
        """
        Start a child OTel span for a Redis command.
        Returns the span context manager or None when tracing is disabled.
        """
        try:
            from app.config import settings
            if not settings.ENABLE_TRACING:
                return None

            from opentelemetry import trace
            from opentelemetry.trace import SpanKind
            from opentelemetry.semconv.trace import SpanAttributes

            tracer = trace.get_tracer("app.redis")
            span = tracer.start_span(
                f"redis.{command}",
                kind=SpanKind.CLIENT,
            )
            # Standard OpenTelemetry database semantic conventions
            span.set_attribute(SpanAttributes.DB_SYSTEM, "redis")
            span.set_attribute(SpanAttributes.DB_OPERATION, command)

            return span

        except Exception:
            # Never let OTel failures break Redis operations
            return None

    @staticmethod
    def _end_otel_span(span, success: bool, duration: float, exc: Exception | None = None) -> None:
        """Finish an OTel span, marking error status if needed."""
        try:
            from opentelemetry.trace import StatusCode

            span.set_attribute("db.redis.duration_ms", round(duration * 1000, 3))

            if success:
                span.set_status(StatusCode.OK)
            else:
                span.set_status(StatusCode.ERROR, str(exc) if exc else "Redis error")
                if exc is not None:
                    span.record_exception(exc)

            span.end()
        except Exception:
            pass

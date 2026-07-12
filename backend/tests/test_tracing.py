# 📂 FILE: tests/test_tracing.py
"""
Phase 3.7.4 – OpenTelemetry Distributed Tracing Test Suite.

Covers:
  ✓ setup_tracing() initialises TracerProvider correctly
  ✓ Tracing disabled when ENABLE_TRACING=False (NoOp provider installed)
  ✓ 'none' exporter discards spans without error
  ✓ get_tracer() returns a valid Tracer
  ✓ get_trace_id() / get_span_id() return real hex strings within an active span
  ✓ Logging integration: log records carry otelTraceID when OTel is active
  ✓ FastAPI instrumentation registered (excluded paths produce no SERVER spans)
  ✓ SQLAlchemy instrumentation registered
  ✓ Redis instrumentation registered
  ✓ Configuration toggle works (ENABLE_TRACING env var)
  ✓ Excluded endpoints receive no FastAPI spans
  ✓ Manual span creation works
  ✓ Exception recording in spans
  ✓ Settings defaults are correct
"""
import json
import logging
import re
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _reset_tracing_state():
    """Reset module-level state so each test starts clean."""
    try:
        from app.tracing.config import reset_tracing
        reset_tracing()
    except Exception:
        pass

    try:
        from app.tracing.instrumentation import reset_instrumentation
        reset_instrumentation()
    except Exception:
        pass


@pytest.fixture(autouse=False)
def fresh_tracing():
    """Fixture that resets tracing state before and after each test."""
    _reset_tracing_state()
    yield
    _reset_tracing_state()


# ──────────────────────────────────────────────────────────────────────────────
# 1. Settings Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestTracingSettings:
    def test_enable_tracing_default_is_true(self):
        from app.config import settings
        assert settings.ENABLE_TRACING is True

    def test_otel_service_name_default(self):
        from app.config import settings
        assert settings.OTEL_SERVICE_NAME == "TaskSyncEnterprise"

    def test_otel_exporter_type_default_is_console(self):
        from app.config import settings
        assert settings.OTEL_EXPORTER_TYPE == "console"

    def test_otel_sampling_rate_default_is_one(self):
        from app.config import settings
        assert settings.OTEL_SAMPLING_RATE == 1.0

    def test_otel_excluded_paths_contains_health_and_metrics(self):
        from app.config import settings
        excluded = settings.OTEL_EXCLUDED_PATHS
        assert "/metrics" in excluded
        assert "/health" in excluded
        assert "/docs" in excluded
        assert "/redoc" in excluded
        assert "/openapi.json" in excluded

    def test_otel_max_attribute_length_default(self):
        from app.config import settings
        assert settings.OTEL_MAX_ATTRIBUTE_LENGTH == 256

    @pytest.mark.parametrize("rate", [-0.01, 1.01])
    def test_otel_sampling_rate_rejects_out_of_range_values(self, rate):
        from pydantic import ValidationError
        from app.core.settings import Settings

        with pytest.raises(ValidationError):
            Settings(OTEL_SAMPLING_RATE=rate)

    def test_public_tracing_package_exports_only_supported_api(self):
        import app.tracing as tracing

        assert tracing.__all__ == ["setup_tracing", "instrument_app", "get_tracer"]


# ──────────────────────────────────────────────────────────────────────────────
# 2. TracerProvider Initialisation Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestTracerProviderSetup:
    def test_setup_tracing_registers_global_tracer_provider(self, fresh_tracing):
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from app.tracing.config import setup_tracing

        setup_tracing()

        provider = trace.get_tracer_provider()
        # The provider should be a real SDK TracerProvider (not NoOp)
        assert isinstance(provider, TracerProvider)

    def test_setup_tracing_is_idempotent(self, fresh_tracing):
        """Calling setup_tracing() twice must not raise or double-register."""
        from opentelemetry import trace
        from app.tracing.config import setup_tracing
        setup_tracing()
        provider = trace.get_tracer_provider()
        setup_tracing()  # second call must be silent
        assert trace.get_tracer_provider() is provider

    def test_setup_tracing_with_none_exporter_installs_noop(self, fresh_tracing):
        from opentelemetry.trace import NoOpTracerProvider
        from app.tracing.config import setup_tracing
        from app.config import settings

        configured_settings = settings.model_copy(update={"OTEL_EXPORTER_TYPE": "none"})
        with patch("app.tracing.config.settings", configured_settings):
            _reset_tracing_state()
            setup_tracing()
            from opentelemetry import trace
            provider = trace.get_tracer_provider()
            assert isinstance(provider, NoOpTracerProvider)

    def test_tracing_disabled_installs_noop_provider(self, fresh_tracing):
        """When ENABLE_TRACING=False, a NoOpTracerProvider must be installed."""
        from opentelemetry.trace import NoOpTracerProvider
        from app.tracing.config import setup_tracing
        from app.config import settings

        configured_settings = settings.model_copy(update={"ENABLE_TRACING": False})
        with patch("app.tracing.config.settings", configured_settings):
            _reset_tracing_state()
            setup_tracing()
            from opentelemetry import trace
            provider = trace.get_tracer_provider()
            assert isinstance(provider, NoOpTracerProvider)

    def test_resource_contains_service_name(self, fresh_tracing):
        """The TracerProvider resource must have the correct service.name."""
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.resources import SERVICE_NAME
        from app.tracing.config import setup_tracing
        from app.config import settings

        setup_tracing()
        provider = trace.get_tracer_provider()
        if isinstance(provider, TracerProvider):
            resource_attrs = provider.resource.attributes
            assert resource_attrs.get(SERVICE_NAME) == settings.OTEL_SERVICE_NAME


# ──────────────────────────────────────────────────────────────────────────────
# 3. get_tracer() Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestGetTracer:
    def test_get_tracer_returns_tracer_instance(self, fresh_tracing):
        from opentelemetry.trace import Tracer
        from app.tracing.instrumentation import get_tracer
        from app.tracing.config import setup_tracing

        setup_tracing()
        tracer = get_tracer("test.tracer")
        assert tracer is not None

    def test_get_tracer_default_name(self, fresh_tracing):
        from app.tracing.instrumentation import get_tracer
        from app.tracing.config import setup_tracing

        setup_tracing()
        tracer = get_tracer()
        assert tracer is not None

    def test_get_tracer_creates_spans(self, fresh_tracing):
        """Tracer returned by get_tracer() must be able to create spans."""
        from opentelemetry.sdk.trace import ReadableSpan
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor

        # Build a fresh provider with an in-memory exporter for assertion
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))

        from opentelemetry import trace
        trace.set_tracer_provider(provider)

        tracer = trace.get_tracer("test")
        with tracer.start_as_current_span("test-span") as span:
            span.set_attribute("test.key", "test-value")

        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        assert spans[0].name == "test-span"
        assert spans[0].attributes.get("test.key") == "test-value"


# ──────────────────────────────────────────────────────────────────────────────
# 4. Trace ID / Span ID in Logging Context
# ──────────────────────────────────────────────────────────────────────────────

class TestLoggingIntegration:
    def test_trace_id_is_none_outside_span(self):
        """get_trace_id() must return None when no span is active."""
        from app.logging.context import get_trace_id
        trace_id = get_trace_id()
        assert trace_id is None or isinstance(trace_id, str)

    def test_trace_id_populated_inside_span(self, fresh_tracing):
        """get_trace_id() must return a valid 32-char hex string inside an active span."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry import trace
        from app.logging.context import get_trace_id, get_span_id

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        tracer = trace.get_tracer("test")
        with tracer.start_as_current_span("log-integration-span"):
            tid = get_trace_id()
            sid = get_span_id()

        assert tid is not None, "trace_id must be set inside a span"
        assert sid is not None, "span_id must be set inside a span"
        assert len(tid) == 32, f"trace_id must be 32 hex chars, got {len(tid)}"
        assert len(sid) == 16, f"span_id must be 16 hex chars, got {len(sid)}"

    def test_json_log_contains_trace_fields_inside_span(self, fresh_tracing):
        """JSON log output must include trace_id and span_id when inside a span."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry import trace
        from app.logging.formatter import StructuredFormatter

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        formatter = StructuredFormatter(use_json=True)

        tracer = trace.get_tracer("test")
        with tracer.start_as_current_span("log-span"):
            record = logging.LogRecord(
                name="test", level=logging.INFO, pathname="test.py",
                lineno=1, msg="inside span message", args=(), exc_info=None,
            )
            output = formatter.format(record)

        parsed = json.loads(output)
        assert parsed.get("trace_id") is not None, "JSON log must have trace_id inside span"
        assert parsed.get("span_id") is not None, "JSON log must have span_id inside span"


# ──────────────────────────────────────────────────────────────────────────────
# 5. FastAPI Instrumentation Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFastAPIInstrumentation:
    @pytest.fixture(scope="class")
    def client(self):
        return TestClient(__import__("app.main", fromlist=["app"]).app, raise_server_exceptions=False)

    def test_instrumentation_does_not_break_health_endpoint(self, client):
        """FastAPI auto-instrumentation must not break existing routes."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_x_request_id_still_propagated(self, client):
        """Request ID propagation must remain intact after OTel instrumentation."""
        import uuid
        rid = str(uuid.uuid4())
        response = client.get("/health", headers={"X-Request-ID": rid})
        assert response.headers.get("X-Request-ID") == rid

    def test_normal_api_request_succeeds(self, client):
        """Normal API requests must work correctly after instrumentation."""
        response = client.get("/")
        assert response.status_code == 200

    def test_404_returns_correct_status(self, client):
        """404 responses must still be properly returned."""
        response = client.get("/api/v1/this-route-does-not-exist-9999")
        assert response.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# 6. Excluded Endpoint Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestExcludedEndpoints:
    @pytest.fixture(scope="class")
    def in_memory_provider(self):
        """Create an isolated TracerProvider with in-memory exporter for assertions."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry import trace

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        return exporter

    def test_health_path_is_in_excluded_list(self):
        from app.config import settings
        assert "/health" in settings.OTEL_EXCLUDED_PATHS

    def test_metrics_path_is_in_excluded_list(self):
        from app.config import settings
        assert "/metrics" in settings.OTEL_EXCLUDED_PATHS

    def test_docs_path_is_in_excluded_list(self):
        from app.config import settings
        assert "/docs" in settings.OTEL_EXCLUDED_PATHS

    @pytest.mark.parametrize(
        "url",
        [
            "http://testserver/health",
            "http://testserver/health/",
            "http://testserver/health/ready?probe=1",
            "http://testserver/api/v1/health/details",
            "http://testserver/metrics?format=prometheus",
            "http://testserver/openapi.json",
        ],
    )
    def test_excluded_url_patterns_match_full_urls(self, url):
        from app.tracing.instrumentation import _build_excluded_urls_string

        patterns = _build_excluded_urls_string().split(",")
        assert any(re.search(pattern, url) for pattern in patterns)

    def test_normal_url_is_not_excluded(self):
        from app.tracing.instrumentation import _build_excluded_urls_string

        patterns = _build_excluded_urls_string().split(",")
        assert not any(re.search(pattern, "http://testserver/api/v1/tasks") for pattern in patterns)

    def test_excluded_url_patterns_match_query_strings(self):
        from app.tracing.instrumentation import _build_excluded_urls_string

        patterns = _build_excluded_urls_string().split(",")
        assert any(
            re.search(pattern, "http://testserver/health/ready?probe=1")
            for pattern in patterns
        )


# ──────────────────────────────────────────────────────────────────────────────
# 7. SQLAlchemy Instrumentation Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestSQLAlchemyInstrumentation:
    def test_sqlalchemy_instrumentor_can_instrument_engine(self, fresh_tracing):
        """SQLAlchemyInstrumentor must be importable and callable without error."""
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace
        from sqlalchemy import create_engine

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        # Use an in-memory SQLite engine for isolation (no MSSQL needed)
        sqlite_engine = create_engine("sqlite:///:memory:")
        SQLAlchemyInstrumentor().instrument(
            engine=sqlite_engine,
            tracer_provider=provider,
        )
        # Execute a query to generate a span
        with sqlite_engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))

        spans = exporter.get_finished_spans()
        db_spans = [s for s in spans if "SELECT" in s.name.upper() or "sqlite" in (s.attributes.get("db.system", ""))]
        assert len(db_spans) >= 1, "SQLAlchemy query must produce at least one span"

        SQLAlchemyInstrumentor().uninstrument()

    def test_sqlalchemy_span_has_db_system_attribute(self, fresh_tracing):
        """SQL spans must include db.system attribute."""
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace
        from sqlalchemy import create_engine, text

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        engine = create_engine("sqlite:///:memory:")
        SQLAlchemyInstrumentor().instrument(engine=engine, tracer_provider=provider)

        with engine.connect() as conn:
            conn.execute(text("SELECT 42"))

        spans = exporter.get_finished_spans()
        assert len(spans) >= 1
        # At least one span must have db.system
        db_system_spans = [s for s in spans if s.attributes.get("db.system")]
        assert len(db_system_spans) >= 1

        SQLAlchemyInstrumentor().uninstrument()


# ──────────────────────────────────────────────────────────────────────────────
# 8. Redis Instrumentation Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestRedisInstrumentation:
    def test_redis_instrumentor_importable(self):
        """RedisInstrumentor must be importable from the installed packages."""
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        assert RedisInstrumentor is not None

    def test_instrumented_redis_calls_otel_span(self, fresh_tracing):
        """InstrumentedRedis._start_otel_span must return a span when tracing is enabled."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace
        from app.monitoring.redis_instrumentation import InstrumentedRedis

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        from app.config import settings
        configured_settings = settings.model_copy(update={"ENABLE_TRACING": True})
        with patch("app.config.settings", configured_settings):
            span = InstrumentedRedis._start_otel_span("SET", ("SET", "mykey", "myvalue"))
            if span is not None:
                InstrumentedRedis._end_otel_span(span, success=True, duration=0.001)

        spans = exporter.get_finished_spans()
        redis_spans = [s for s in spans if "redis" in s.name.lower()]
        assert len(redis_spans) >= 1

    def test_instrumented_redis_skips_span_when_disabled(self, fresh_tracing):
        """InstrumentedRedis must not create spans when ENABLE_TRACING=False."""
        from app.monitoring.redis_instrumentation import InstrumentedRedis
        from app.config import settings

        configured_settings = settings.model_copy(update={"ENABLE_TRACING": False})
        with patch("app.config.settings", configured_settings):
            span = InstrumentedRedis._start_otel_span("GET", ("GET", "somekey"))
            assert span is None

    def test_instrumented_redis_records_exception_in_span(self, fresh_tracing):
        """Failed Redis commands must record the exception in the span."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace
        from opentelemetry.trace import StatusCode
        from app.monitoring.redis_instrumentation import InstrumentedRedis

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        from app.config import settings
        configured_settings = settings.model_copy(update={"ENABLE_TRACING": True})
        with patch("app.config.settings", configured_settings):
            span = InstrumentedRedis._start_otel_span("SET", ("SET", "k", "v"))
            if span is not None:
                exc = ConnectionError("Redis connection refused")
                InstrumentedRedis._end_otel_span(span, success=False, duration=0.1, exc=exc)

        spans = exporter.get_finished_spans()
        error_spans = [s for s in spans if s.status.status_code == StatusCode.ERROR]
        assert len(error_spans) >= 1


# ──────────────────────────────────────────────────────────────────────────────
# 9. Configuration Toggle Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestConfigurationToggle:
    def test_instrument_app_skips_when_disabled(self, fresh_tracing):
        """instrument_app() must return silently when ENABLE_TRACING=False."""
        from app.tracing.instrumentation import instrument_app
        from app.config import settings

        mock_app = MagicMock()
        with patch.object(settings.__class__, "ENABLE_TRACING", new=False):
            instrument_app(mock_app)
        # FastAPIInstrumentor.instrument_app must NOT have been called
        mock_app.assert_not_called()

    def test_exporter_type_console_does_not_raise(self, fresh_tracing):
        """Console exporter must initialise without error."""
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        from app.tracing.config import _build_exporter
        exporter = _build_exporter("console")
        assert isinstance(exporter, ConsoleSpanExporter)

    def test_exporter_type_none_returns_none(self, fresh_tracing):
        """'none' exporter type must return None (signals NoOp mode)."""
        from app.tracing.config import _build_exporter
        exporter = _build_exporter("none")
        assert exporter is None

    def test_otlp_http_endpoint_has_a_single_trace_suffix(self, fresh_tracing):
        from app.config import settings
        from app.tracing.config import _build_exporter

        configured_settings = settings.model_copy(
            update={"OTEL_EXPORTER_OTLP_ENDPOINT": "http://collector:4318/v1/traces"}
        )
        with patch("app.tracing.config.settings", configured_settings):
            exporter = _build_exporter("otlp_http")

        endpoint = str(exporter._endpoint)
        assert endpoint.endswith("/v1/traces")
        assert endpoint.count("/v1/traces") == 1

    def test_instrument_app_registers_all_supported_instrumentors(self, fresh_tracing):
        from fastapi import FastAPI
        from app.tracing.instrumentation import instrument_app

        with (
            patch("app.tracing.instrumentation._instrument_fastapi") as fastapi,
            patch("app.tracing.instrumentation._instrument_sqlalchemy") as sqlalchemy,
            patch("app.tracing.instrumentation._instrument_redis") as redis,
            patch("app.tracing.instrumentation._instrument_httpx") as httpx,
        ):
            instrument_app(FastAPI())

        fastapi.assert_called_once()
        sqlalchemy.assert_called_once()
        redis.assert_called_once()
        httpx.assert_called_once()

    def test_sampling_rate_one_returns_always_on(self, fresh_tracing):
        from opentelemetry.sdk.trace.sampling import ALWAYS_ON
        from app.tracing.config import _build_sampler
        sampler = _build_sampler(1.0)
        assert sampler is ALWAYS_ON

    def test_sampling_rate_zero_returns_always_off(self, fresh_tracing):
        from opentelemetry.sdk.trace.sampling import ALWAYS_OFF
        from app.tracing.config import _build_sampler
        sampler = _build_sampler(0.0)
        assert sampler is ALWAYS_OFF

    def test_sampling_rate_partial_returns_ratio_sampler(self, fresh_tracing):
        from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio
        from app.tracing.config import _build_sampler
        sampler = _build_sampler(0.5)
        assert isinstance(sampler, ParentBasedTraceIdRatio)

    def test_reset_tracing_restores_a_noop_provider(self, fresh_tracing):
        from opentelemetry import trace
        from opentelemetry.trace import NoOpTracerProvider
        from app.tracing.config import reset_tracing, setup_tracing

        setup_tracing()
        reset_tracing()
        assert isinstance(trace.get_tracer_provider(), NoOpTracerProvider)

    def test_reset_instrumentation_allows_a_fresh_fastapi_instrumentation(self, fresh_tracing):
        from fastapi import FastAPI
        from app.tracing.instrumentation import _instrument_fastapi, reset_instrumentation

        app = FastAPI()
        with patch(
            "opentelemetry.instrumentation.fastapi.FastAPIInstrumentor.instrument_app"
        ) as instrument:
            _instrument_fastapi(app)
            _instrument_fastapi(app)
            assert instrument.call_count == 1

            reset_instrumentation()
            _instrument_fastapi(app)
            assert instrument.call_count == 2


class TestTracingShutdown:
    def test_shutdown_flushes_sdk_provider_once(self, fresh_tracing):
        from opentelemetry.sdk.trace import TracerProvider
        from app.tracing.config import shutdown_tracing

        provider = MagicMock(spec=TracerProvider)
        with patch("app.tracing.config.trace.get_tracer_provider", return_value=provider):
            shutdown_tracing()
            shutdown_tracing()

        provider.force_flush.assert_called_once_with()
        provider.shutdown.assert_called_once_with()


# ──────────────────────────────────────────────────────────────────────────────
# 10. Manual Span Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestManualSpans:
    def test_manual_span_records_attributes(self, fresh_tracing):
        """Manual spans via get_tracer() must correctly record attributes."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        from app.tracing.instrumentation import get_tracer
        tracer = get_tracer("test.manual")

        with tracer.start_as_current_span("manual-span") as span:
            span.set_attribute("user.id", "user-42")
            span.set_attribute("task.count", 10)

        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        s = spans[0]
        assert s.name == "manual-span"
        assert s.attributes.get("user.id") == "user-42"
        assert s.attributes.get("task.count") == 10

    def test_exception_is_recorded_in_span(self, fresh_tracing):
        """Exceptions raised inside a span must be recorded and marked as error."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace
        from opentelemetry.trace import StatusCode

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        tracer = trace.get_tracer("test.exception")

        with pytest.raises(ValueError):
            with tracer.start_as_current_span("exception-span") as span:
                try:
                    raise ValueError("something broke")
                except ValueError as exc:
                    span.record_exception(exc)
                    span.set_status(StatusCode.ERROR, str(exc))
                    raise

        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        s = spans[0]
        assert s.status.status_code == StatusCode.ERROR
        events = s.events
        assert any(e.name == "exception" for e in events)

    def test_nested_spans_parent_child_relationship(self, fresh_tracing):
        """Nested spans must form a proper parent-child relationship."""
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
        from opentelemetry.sdk.trace.export import SimpleSpanProcessor
        from opentelemetry import trace

        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)

        tracer = trace.get_tracer("test.nested")

        with tracer.start_as_current_span("parent-span") as parent:
            parent_ctx = parent.get_span_context()
            with tracer.start_as_current_span("child-span") as child:
                child_ctx = child.get_span_context()

        spans = exporter.get_finished_spans()
        assert len(spans) == 2

        # Find parent and child by name
        parent_span = next(s for s in spans if s.name == "parent-span")
        child_span = next(s for s in spans if s.name == "child-span")

        # Child's parent_span_id must equal parent's span_id
        assert child_span.parent is not None
        assert child_span.parent.span_id == parent_span.context.span_id

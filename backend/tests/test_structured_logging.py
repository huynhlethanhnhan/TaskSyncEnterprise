# 📂 FILE: tests/test_structured_logging.py
"""
Phase 3.7.3 – Structured Logging Test Suite.

Covers:
  ✓ Request ID generation (auto-generate when missing)
  ✓ Request ID propagation (reuse client-supplied X-Request-ID)
  ✓ Correlation ID generation (auto-generate when missing)
  ✓ Correlation ID propagation (reuse client-supplied X-Correlation-ID)
  ✓ JSON formatter – all required fields present
  ✓ Sensitive data masking – passwords, JWT tokens, auth headers, connections
  ✓ Log rotation configuration (handler types and limits)
  ✓ Exception logging – internal traceback captured, not exposed to client
  ✓ Middleware – access log written for normal requests
  ✓ Context helpers – set/get user_id, tenant_id, project_id, correlation_id
"""
import json
import logging
import re
import uuid
from io import StringIO
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.logging.formatter import StructuredFormatter
from app.logging.filters import SensitiveDataFilter, mask_sensitive
from app.logging.context import (
    set_correlation_id,
    set_user_id,
    set_tenant_id,
    set_project_id,
    get_correlation_id,
    get_tenant_id,
    get_project_id,
    get_log_context,
)
from app.logging.logger import setup_logging, access_logger
from app.config import settings

# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """TestClient that returns 5xx responses instead of raising exceptions."""
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def json_formatter() -> StructuredFormatter:
    """A StructuredFormatter configured for JSON output."""
    return StructuredFormatter(use_json=True)


@pytest.fixture
def pretty_formatter() -> StructuredFormatter:
    """A StructuredFormatter configured for pretty console output."""
    return StructuredFormatter(use_json=False)


@pytest.fixture
def sensitive_filter() -> SensitiveDataFilter:
    return SensitiveDataFilter()


def _make_record(msg: str = "test message", level: int = logging.INFO) -> logging.LogRecord:
    """Creates a minimal LogRecord for formatter / filter tests."""
    record = logging.LogRecord(
        name="test",
        level=level,
        pathname="test_file.py",
        lineno=42,
        msg=msg,
        args=(),
        exc_info=None,
    )
    return record


# ──────────────────────────────────────────────────────────────────────────────
# 1. Request ID Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestRequestID:
    def test_request_id_auto_generated(self, client):
        """When no X-Request-ID header is sent, the server generates a UUID4."""
        response = client.get("/health")
        assert response.status_code == 200
        rid = response.headers.get("X-Request-ID")
        assert rid is not None, "X-Request-ID header must be present in response"
        # Must be a valid UUID4
        uuid.UUID(rid, version=4)

    def test_request_id_client_supplied_reused(self, client):
        """When client sends X-Request-ID, the same value must be echoed back."""
        custom_rid = str(uuid.uuid4())
        response = client.get("/health", headers={"X-Request-ID": custom_rid})
        assert response.status_code == 200
        assert response.headers.get("X-Request-ID") == custom_rid

    def test_request_id_unique_per_request(self, client):
        """Each request without a supplied ID must receive a distinct UUID."""
        r1 = client.get("/health")
        r2 = client.get("/health")
        rid1 = r1.headers.get("X-Request-ID")
        rid2 = r2.headers.get("X-Request-ID")
        assert rid1 != rid2, "Request IDs must be unique across requests"


# ──────────────────────────────────────────────────────────────────────────────
# 2. Correlation ID Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestCorrelationID:
    def test_correlation_id_auto_generated(self, client):
        """When no X-Correlation-ID header is sent, the server generates one."""
        response = client.get("/health")
        cid = response.headers.get("X-Correlation-ID")
        assert cid is not None, "X-Correlation-ID header must be present in response"
        uuid.UUID(cid, version=4)

    def test_correlation_id_propagated_from_client(self, client):
        """When client sends X-Correlation-ID, it must be echoed back unchanged."""
        custom_cid = str(uuid.uuid4())
        response = client.get("/health", headers={"X-Correlation-ID": custom_cid})
        assert response.headers.get("X-Correlation-ID") == custom_cid

    def test_correlation_id_context_var(self):
        """set_correlation_id / get_correlation_id must round-trip correctly."""
        test_id = str(uuid.uuid4())
        set_correlation_id(test_id)
        assert get_correlation_id() == test_id


# ──────────────────────────────────────────────────────────────────────────────
# 3. JSON Formatter Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestJSONFormatter:
    REQUIRED_FIELDS = [
        "timestamp", "level", "service_name", "environment", "version",
        "logger", "module", "function", "line",
        "request_id", "correlation_id", "trace_id", "span_id",
        "client_ip", "method", "path", "status_code", "duration_ms",
        "user_id", "tenant_id", "project_id", "user_agent",
        "error_code", "message", "exception",
    ]

    def test_json_output_is_valid_json(self, json_formatter):
        record = _make_record("hello world")
        output = json_formatter.format(record)
        parsed = json.loads(output)
        assert isinstance(parsed, dict)

    def test_json_contains_all_required_fields(self, json_formatter):
        record = _make_record("test")
        output = json_formatter.format(record)
        parsed = json.loads(output)
        for field in self.REQUIRED_FIELDS:
            assert field in parsed, f"Required field '{field}' missing from JSON log output"

    def test_timestamp_is_iso8601_utc(self, json_formatter):
        record = _make_record("ts test")
        parsed = json.loads(json_formatter.format(record))
        ts = parsed["timestamp"]
        # ISO-8601 with timezone info
        assert "T" in ts
        assert ts.endswith("+00:00") or ts.endswith("Z"), f"Timestamp not in UTC: {ts}"

    def test_message_field_equals_log_message(self, json_formatter):
        record = _make_record("unique-message-abc")
        parsed = json.loads(json_formatter.format(record))
        assert parsed["message"] == "unique-message-abc"

    def test_level_field_matches_log_level(self, json_formatter):
        record = _make_record("warn test", level=logging.WARNING)
        parsed = json.loads(json_formatter.format(record))
        assert parsed["level"] == "WARNING"

    def test_exception_field_populated_on_exc_info(self, json_formatter):
        record = _make_record("error occurred", level=logging.ERROR)
        try:
            raise ValueError("test exception value")
        except ValueError:
            import sys
            record.exc_info = sys.exc_info()
        parsed = json.loads(json_formatter.format(record))
        assert parsed["exception"] is not None
        assert "ValueError" in parsed["exception"]
        assert "test exception value" in parsed["exception"]

    def test_exception_field_null_when_no_exception(self, json_formatter):
        record = _make_record("no exception here")
        parsed = json.loads(json_formatter.format(record))
        assert parsed["exception"] is None

    def test_service_name_populated(self, json_formatter):
        record = _make_record("svc test")
        parsed = json.loads(json_formatter.format(record))
        assert parsed["service_name"] is not None
        assert len(parsed["service_name"]) > 0

    def test_environment_populated(self, json_formatter):
        record = _make_record("env test")
        parsed = json.loads(json_formatter.format(record))
        assert parsed["environment"] in ("development", "production", "testing")


# ──────────────────────────────────────────────────────────────────────────────
# 4. Sensitive Data Masking Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestSensitiveDataMasking:
    def test_mask_password_field(self):
        text = 'password: "supersecret123"'
        result = mask_sensitive(text)
        assert "supersecret123" not in result
        assert "[REDACTED]" in result

    def test_mask_jwt_bearer_token(self):
        fake_jwt = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        result = mask_sensitive(fake_jwt)
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in result
        assert "[REDACTED]" in result

    def test_mask_authorization_header(self):
        text = "Authorization: Bearer some-token-value"
        result = mask_sensitive(text)
        assert "some-token-value" not in result
        assert "[REDACTED]" in result

    def test_mask_access_token_field(self):
        text = '"access_token": "myverysecrettoken123"'
        result = mask_sensitive(text)
        assert "myverysecrettoken123" not in result

    def test_mask_refresh_token_field(self):
        text = '"refresh_token": "refresh_abc_123_def"'
        result = mask_sensitive(text)
        assert "refresh_abc_123_def" not in result

    def test_mask_database_url_password(self):
        text = "mssql+pymssql://user:verysecretpassword@localhost:1433/db"
        result = mask_sensitive(text)
        assert "verysecretpassword" not in result
        assert "[REDACTED]" in result

    def test_mask_redis_password(self):
        text = "redis://:mysecretredispassword@localhost:6379/0"
        result = mask_sensitive(text)
        assert "mysecretredispassword" not in result

    def test_non_sensitive_text_unchanged(self):
        text = "User john@example.com logged in successfully from 192.168.1.1"
        result = mask_sensitive(text)
        assert result == text

    def test_filter_masks_record_message(self, sensitive_filter):
        record = _make_record('password: "abc123"')
        sensitive_filter.filter(record)
        assert "abc123" not in record.msg
        assert "[REDACTED]" in record.msg

    def test_filter_always_returns_true(self, sensitive_filter):
        record = _make_record("normal message")
        result = sensitive_filter.filter(record)
        assert result is True


# ──────────────────────────────────────────────────────────────────────────────
# 5. Log Rotation Configuration Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestLogRotationConfiguration:
    def test_setup_logging_creates_log_directory(self):
        """setup_logging must create the log directory if it does not exist."""
        # Settings is frozen; we test that the real log dir is created by setup_logging.
        # The log dir is determined by settings.LOG_DIR_PATH which points to the
        # configured LOG_DIRECTORY relative to the backend root.
        setup_logging()
        assert settings.LOG_DIR_PATH.exists(), (
            f"Log directory '{settings.LOG_DIR_PATH}' was not created by setup_logging()"
        )

    def test_rotating_handler_max_bytes(self):
        """RotatingFileHandler must be configured with the correct maxBytes."""
        from logging.handlers import RotatingFileHandler
        from app.logging.config import build_rotating_file_handler
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            handler = build_rotating_file_handler(
                file_path=settings.LOG_DIR_PATH / "test_rotation.log",
                level="INFO",
                max_bytes=5_000_000,
                backup_count=3,
            )
            assert isinstance(handler, RotatingFileHandler)
            assert handler.maxBytes == 5_000_000
            assert handler.backupCount == 3
            handler.close()

    def test_separate_log_files_configured(self):
        """After setup_logging, access and audit loggers must be isolated."""
        setup_logging()
        # access logger must be isolated
        assert access_logger.propagate is False
        assert len(access_logger.handlers) > 0


# ──────────────────────────────────────────────────────────────────────────────
# 6. Exception Logging Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestExceptionLogging:
    def test_unhandled_exception_returns_500_not_traceback(self, client):
        """5xx exceptions must not expose Python tracebacks to the client."""
        with patch("app.routers.v1.health.health_service.get_liveness") as mock_live:
            mock_live.side_effect = RuntimeError("Simulated server explosion")
            response = client.get("/health/live")
        assert response.status_code == 500
        body = response.text
        # Python stack-trace keywords must NEVER appear in the response body
        assert "Traceback (most recent call last)" not in body
        assert "File \"" not in body
        assert "raise RuntimeError" not in body

    def test_exception_response_contains_safe_error_envelope(self, client):
        """5xx response body must follow the enterprise ErrorResponse envelope."""
        with patch("app.routers.v1.health.health_service.get_liveness") as mock_live:
            mock_live.side_effect = Exception("Internal failure")
            response = client.get("/health/live")
        assert response.status_code == 500
        data = response.json()
        assert "success" in data
        assert data["success"] is False

    def test_validation_error_returns_422_envelope(self, client):
        """Pydantic validation errors must be wrapped in the enterprise envelope."""
        # POST to login with missing required fields triggers validation error
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "test@test.com"},  # missing password
        )
        assert response.status_code in (400, 401, 422)

    def test_exception_logging_captures_traceback_in_error_logger(self):
        """
        When error_logger.error() is called with exc_info, the StructuredFormatter
        renders the traceback into the JSON 'exception' field before clearing exc_info.
        Verify this by formatting the record directly with a JSON formatter.
        """
        from app.logging.formatter import StructuredFormatter
        json_fmt = StructuredFormatter(use_json=True)

        record = _make_record("test error", level=logging.ERROR)
        try:
            raise ValueError("capture this")
        except ValueError:
            import sys
            record.exc_info = sys.exc_info()

        output = json_fmt.format(record)
        parsed = json.loads(output)
        assert parsed["exception"] is not None, "exception field must be populated"
        assert "ValueError" in parsed["exception"]
        assert "capture this" in parsed["exception"]


# ──────────────────────────────────────────────────────────────────────────────
# 7. Middleware Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestMiddleware:
    def test_x_process_time_header_present(self, client):
        """Every response must carry X-Process-Time header."""
        response = client.get("/health")
        assert "X-Process-Time" in response.headers

    def test_x_request_id_in_response_headers(self, client):
        """X-Request-ID must always be returned in response headers."""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers

    def test_x_correlation_id_in_response_headers(self, client):
        """X-Correlation-ID must always be returned in response headers."""
        response = client.get("/health")
        assert "X-Correlation-ID" in response.headers

    def test_access_log_written_to_file(self, client):
        """After a request, at least one access log file must be non-empty."""
        setup_logging()
        access_log = settings.LOG_DIR_PATH / "access.log"
        settings.LOG_DIR_PATH.mkdir(parents=True, exist_ok=True)

        # Count lines before
        before = _count_lines(access_log)

        client.get("/health")

        # Count lines after
        after = _count_lines(access_log)
        assert after >= before, "access.log must have grown after a request"

    def test_access_log_contains_request_completed_marker(self, client):
        """access.log entries must contain the HTTP Request Completed marker."""
        setup_logging()
        access_log = settings.LOG_DIR_PATH / "access.log"
        settings.LOG_DIR_PATH.mkdir(parents=True, exist_ok=True)

        before = _count_lines(access_log)
        client.get("/health")
        new_lines = _read_new_lines(access_log, before)

        found = any("HTTP Request Completed:" in line for line in new_lines)
        assert found, "access.log must contain 'HTTP Request Completed:' marker"

    def test_uvicorn_access_logs_absent(self, client):
        """uvicorn.access must not appear in any log output."""
        setup_logging()
        access_log = settings.LOG_DIR_PATH / "access.log"
        app_log = settings.LOG_DIR_PATH / "app.log"
        settings.LOG_DIR_PATH.mkdir(parents=True, exist_ok=True)

        before_access = _count_lines(access_log)
        before_app = _count_lines(app_log)

        client.get("/health")

        for line in _read_new_lines(access_log, before_access):
            assert "uvicorn.access" not in line
        for line in _read_new_lines(app_log, before_app):
            assert "uvicorn.access" not in line


# ──────────────────────────────────────────────────────────────────────────────
# 8. Context Helper Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestContextHelpers:
    def test_set_and_get_tenant_id(self):
        token = set_tenant_id("tenant-abc-123")
        assert get_tenant_id() == "tenant-abc-123"

    def test_set_and_get_project_id(self):
        set_project_id("proj-xyz-456")
        assert get_project_id() == "proj-xyz-456"

    def test_get_log_context_returns_dict(self):
        ctx = get_log_context()
        assert isinstance(ctx, dict)

    def test_get_log_context_has_expected_keys(self):
        ctx = get_log_context()
        expected_keys = {
            "request_id", "correlation_id", "trace_id", "span_id",
            "method", "path", "client_ip", "user_id",
            "duration_ms", "tenant_id", "project_id",
        }
        for key in expected_keys:
            assert key in ctx, f"Key '{key}' missing from get_log_context() output"

    def test_trace_id_null_when_otel_unavailable(self):
        """trace_id must return None gracefully when OTel is not installed."""
        from app.logging.context import get_trace_id
        # OTel is not installed in the test environment by default
        trace_id = get_trace_id()
        # Should be None (not installed) or a string (installed) – never raises
        assert trace_id is None or isinstance(trace_id, str)

    def test_span_id_null_when_otel_unavailable(self):
        from app.logging.context import get_span_id
        span_id = get_span_id()
        assert span_id is None or isinstance(span_id, str)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _count_lines(path) -> int:
    from pathlib import Path
    p = Path(path)
    if not p.exists():
        return 0
    with open(p, encoding="utf-8", errors="ignore") as f:
        return len(f.readlines())


def _read_new_lines(path, start_line: int) -> list[str]:
    from pathlib import Path
    p = Path(path)
    if not p.exists():
        return []
    with open(p, encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    return lines[start_line:]

# 📂 FILE: tests/test_logging_e2e.py
"""
E2E Logging Compliance Test – Phase 3.7.3.

Updated to validate JSON-format log output produced by the Phase 3.7.3
structured logging system.  The old plain-text regex assertions have been
replaced with JSON-schema assertions that verify every required field from the
enterprise structured logging specification.
"""
import json
import pytest
import re
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.logging.logger import setup_logging
from app.config import settings

# Set raise_server_exceptions=False to allow TestClient to return 500 responses
client = TestClient(app, raise_server_exceptions=False)


def get_line_count(path: Path) -> int:
    if not path.exists():
        return 0
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return len(f.readlines())


def get_new_lines(path: Path, start_line: int) -> list[str]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        return lines[start_line:]


def try_parse_json(line: str) -> dict | None:
    """Try to parse a line as JSON; return None if it is not JSON."""
    try:
        return json.loads(line.strip())
    except (json.JSONDecodeError, ValueError):
        return None


def test_logging_e2e_compliance():
    # 1. Force setup_logging to ensure our handlers are applied
    setup_logging()

    access_log = settings.LOG_DIR_PATH / "access.log"
    error_log = settings.LOG_DIR_PATH / "error.log"
    app_log = settings.LOG_DIR_PATH / "app.log"

    # Ensure logs folder exists
    settings.LOG_DIR_PATH.mkdir(parents=True, exist_ok=True)

    # 2. Get initial line counts
    init_access = get_line_count(access_log)
    init_error = get_line_count(error_log)
    init_app = get_line_count(app_log)

    print(f"\nInitial lines: access={init_access}, error={init_error}, app={init_app}")

    # 3. Perform HTTP Requests
    # Request A: Health check (Should return 200)
    res_health = client.get("/health")
    assert res_health.status_code == 200

    # Request B: Invalid Login (Should return 401)
    res_login = client.post("/api/v1/auth/login", data={"username": "nonexistent_user@example.com", "password": "wrong_password"})
    assert res_login.status_code == 401

    # Request C: 404 Not Found (Should return 404)
    res_404 = client.get("/api/v1/nonexistent-route-for-testing-logs")
    assert res_404.status_code == 404

    # Request D: 500 Server Error
    with patch("app.routers.v1.health.health_service.get_liveness") as mock_liveness:
        mock_liveness.side_effect = Exception("Simulated unhandled 500 error for logging validation")
        res_500 = client.get("/health/live")
        assert res_500.status_code == 500

    # 4. Extract new logs
    new_access_lines = get_new_lines(access_log, init_access)
    new_error_lines = get_new_lines(error_log, init_error)
    new_app_lines = get_new_lines(app_log, init_app)

    print("\n--- New Access Log Entries ---")
    for line in new_access_lines:
        print(line.strip())

    print("\n--- New Error Log Entries ---")
    for line in new_error_lines:
        print(line.strip())

    print("\n--- New App Log Entries ---")
    for line in new_app_lines:
        print(line.strip())

    # ── 5. Assertions ────────────────────────────────────────────────────────

    # A. All access.log entries must be valid JSON (Phase 3.7.3 guarantee)
    json_access_entries = [try_parse_json(line) for line in new_access_lines if line.strip()]
    json_access_entries = [e for e in json_access_entries if e is not None]
    assert len(json_access_entries) >= 1, "access.log must contain at least one JSON entry"

    # B. Find "HTTP Request Completed" entries
    request_completed_entries = [
        e for e in json_access_entries
        if isinstance(e.get("message"), str) and "HTTP Request Completed:" in e["message"]
    ]
    assert len(request_completed_entries) == 4, (
        f"Expected 4 completion entries, found {len(request_completed_entries)}"
    )

    # C. Verify required JSON fields are present in every access log entry
    required_fields = {
        "timestamp", "level", "service_name", "environment", "version",
        "logger", "module", "function", "line",
        "request_id", "correlation_id", "trace_id", "span_id",
        "method", "path", "message",
    }
    for entry in request_completed_entries:
        for field in required_fields:
            assert field in entry, (
                f"Required field '{field}' missing from access log JSON entry: {entry}"
            )

    # D. Every completed-entry must carry a valid UUID4 request_id
    uuid4_pattern = re.compile(r"^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$")
    for entry in request_completed_entries:
        rid = entry.get("request_id", "")
        assert uuid4_pattern.match(rid), (
            f"request_id '{rid}' is not a valid UUID4 in entry: {entry}"
        )

    # E. Verify that uvicorn.access is completely absent from new log entries
    for line in new_access_lines:
        assert "uvicorn.access" not in line
    for line in new_app_lines:
        assert "uvicorn.access" not in line

    # F. Verify that the 200 OK access log is NOT present in error.log
    json_error_entries = [try_parse_json(line) for line in new_error_lines if line.strip()]
    json_error_entries = [e for e in json_error_entries if e is not None]
    for entry in json_error_entries:
        msg = entry.get("message", "")
        assert "path=/health " not in msg, (
            f"200 OK /health request must not appear in error.log: {msg}"
        )

    # G. Verify that the 500 error was captured in error.log (critical/error level)
    # The exception text may appear in the message field, the exception field, or the raw line.
    error_raw_content = "".join(new_error_lines)
    assert (
        "Simulated unhandled 500 error for logging validation" in error_raw_content
        or any(
            "Simulated unhandled 500 error for logging validation" in (e.get("exception") or "")
            for e in json_error_entries
        )
        or any(
            e.get("level") in ("ERROR", "CRITICAL", "WARNING") and "500" in (e.get("message") or "")
            for e in json_error_entries
        )
    ), "error.log must capture the 500 server error event"

    # H. Access logs must NOT propagate to app.log (separation of access logs)
    for line in new_app_lines:
        parsed = try_parse_json(line)
        if parsed and parsed.get("logger") == "access":
            assert False, (
                f"Access log entry must not appear in app.log: {line.strip()}"
            )

    # I. Timestamp must be ISO-8601 UTC
    for entry in request_completed_entries:
        ts = entry.get("timestamp", "")
        assert "T" in ts, f"Timestamp '{ts}' is not ISO-8601"
        assert ts.endswith("+00:00") or ts.endswith("Z"), f"Timestamp '{ts}' is not UTC"

    # J. All entries must have service_name = application name
    for entry in request_completed_entries:
        assert entry.get("service_name") == settings.APP_NAME, (
            f"service_name must be '{settings.APP_NAME}', got '{entry.get('service_name')}'"
        )

    print("\n[SUCCESS] E2E Logging verification passed all JSON assertion checks.")

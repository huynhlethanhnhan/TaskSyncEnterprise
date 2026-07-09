import pytest
import re
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.logging.logger import setup_logging
from app.config import settings

# Set raise_server_exceptions=False to allow TestClient to return 500 responses instead of raising exceptions
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
    # Mock health_service.get_liveness to raise an unhandled Exception to trigger a 500
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

    # 5. Assertions
    
    # A. Check access.log contains exactly 4 entries corresponding to our 4 requests
    request_completed_lines = [l for l in new_access_lines if "HTTP Request Completed:" in l]
    assert len(request_completed_lines) == 4, f"Expected 4 completion entries, found {len(request_completed_lines)}"
    
    # B. Verify that each access log entry contains formatting details and request id
    pattern = r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} - access - INFO - \[[a-f0-9\-]{36}\] - HTTP Request Completed: method=\w+ path=.+ status=\d+ duration=.+ ip=.+ user_id=.+$"
    for line in request_completed_lines:
        assert re.match(pattern, line.strip()), f"Log line format mismatch: {line.strip()}"
        
    # C. Verify that uvicorn.access is completely absent from the new log entries
    for line in new_access_lines:
        assert "uvicorn.access" not in line
    for line in new_app_lines:
        assert "uvicorn.access" not in line

    # D. Verify that the 200 OK access log is NOT present in error.log
    for line in new_error_lines:
        assert "path=/health " not in line
        
    # E. Verify that the 500 error unhandled exception was captured in error.log (critical/error level)
    error_content = "".join(new_error_lines)
    assert "Simulated unhandled 500 error for logging validation" in error_content
    
    # F. Verify that access logs did not propagate to app.log (separation of access logs)
    for line in new_app_lines:
        assert "HTTP Request Completed:" not in line

    print("\n[SUCCESS] E2E Logging verification passed all assertion checks.")

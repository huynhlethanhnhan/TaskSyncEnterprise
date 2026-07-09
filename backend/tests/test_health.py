# 📂 FILE: backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_live():
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["checks"]["process"] == "UP"
    assert data["checks"]["configuration"] == "UP"


def test_health_ready():
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert "database" in data["checks"]
    assert "storage" in data["checks"]


def test_health_detailed():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["application_name"] == "TaskSyncEnterprise"
    assert "server_uptime" in data
    assert "metrics" in data
    assert "diagnostics" in data


def test_security_headers():
    response = client.get("/health")
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"


def test_api_cache_control_headers():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store, no-cache, must-revalidate, max-age=0"
    assert response.headers["Pragma"] == "no-cache"


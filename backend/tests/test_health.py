# 📂 FILE: backend/tests/test_health.py
from unittest.mock import patch


def test_health_simple(client):
    """Verify GET /health returns standard healthy response."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_health_live(client):
    """Verify GET /health/live returns standard liveness response."""
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"


def test_health_ready_success(client):
    """Verify GET /health/ready returns readiness success response when dependencies are healthy."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert data["redis"] == "connected"


def test_health_ready_database_failure(client):
    """Verify GET /health/ready returns HTTP 503 and failed database key when database connection check fails."""
    with patch(
        "app.health.service.HealthService.check_database",
        return_value=(False, "failed"),
    ):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unavailable"
        assert data["database"] == "failed"
        assert data["redis"] == "connected"


def test_health_ready_redis_failure(client):
    """Verify GET /health/ready returns HTTP 503 and failed redis key when Redis connection check fails."""
    with patch(
        "app.health.service.HealthService.check_redis", return_value=(False, "failed")
    ):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unavailable"
        assert data["database"] == "connected"
        assert data["redis"] == "failed"


def test_health_detailed(client):
    """Verify backward compatibility of GET /health/details."""
    from tests.conftest import TestingSessionLocal

    with patch("app.database.SessionLocal", TestingSessionLocal):
        response = client.get("/health/details")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("UP", "DOWN")
    assert "application" in data
    assert "database" in data
    assert "redis" in data
    assert "environment" in data
    assert "version" in data


def test_security_headers(client):
    """Verify standard OWASP security headers exist on health responses."""
    response = client.get("/health")
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"


def test_api_cache_control_headers(client):
    """Verify cache control headers prevent caching on sensitive API-prefixed paths."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert (
        response.headers["Cache-Control"]
        == "no-store, no-cache, must-revalidate, max-age=0"
    )
    assert response.headers["Pragma"] == "no-cache"

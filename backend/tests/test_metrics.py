# 📂 FILE: backend/tests/test_metrics.py
import pytest
from unittest.mock import patch


def test_metrics_endpoint_enabled(client):
    """Verify that /metrics endpoint returns HTTP 200 and Prometheus text format when metrics are enabled."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["Content-Type"]

    content = response.text
    # Verify standard registered counters and gauges
    assert "http_requests_total" in content
    assert "app_uptime_seconds" in content
    assert "db_requests_total" in content
    assert "redis_requests_total" in content


def test_metrics_disabled(client):
    """Verify that /metrics returns 404 when ENABLE_METRICS is False."""
    with patch("app.routers.metrics.settings") as mock_settings:
        mock_settings.ENABLE_METRICS = False
        response = client.get("/metrics")
        assert response.status_code == 404


def test_http_metrics_increment(client):
    """Verify that HTTP requests increment request counters and histograms."""
    # Call health check path to trigger metrics
    response1 = client.get("/health")
    assert response1.status_code == 200

    response2 = client.get("/metrics")
    assert response2.status_code == 200
    content = response2.text

    # Verify HTTP request counter includes GET /health
    assert 'path="/health"' in content
    assert 'http_request_duration_seconds_bucket' in content


def test_business_metrics_exposed(client):
    """Verify that business metrics for tasks, projects, and users are exposed in the metrics payload."""
    response = client.get("/metrics")
    assert response.status_code == 200
    content = response.text

    assert "tasks_created_total" in content
    assert "projects_created_total" in content
    assert "active_users_total" in content


def test_excluded_paths(client):
    """Verify that excluded endpoints like /metrics, /docs, /openapi.json do not register HTTP metrics."""
    # Hit docs and metrics endpoints
    client.get("/metrics")
    client.get("/docs")
    client.get("/openapi.json")

    response = client.get("/metrics")
    content = response.text

    # Counters should NOT contain path records for metrics, docs, or openapi
    assert 'path="/metrics"' not in content
    assert 'path="/docs"' not in content
    assert 'path="/openapi.json"' not in content

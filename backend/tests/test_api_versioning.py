def test_supported_api_version(client):
    """Verify that a supported API version endpoint works normally."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

def test_unsupported_api_version(client):
    """Verify that querying an unsupported version yields a standard 404 error response."""
    response = client.get("/api/v9/health")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["message"] == "Unsupported API Version"
    assert "v1" in data["supported_versions"]

def test_non_api_paths_bypass_validation(client):
    """Verify that non-API root and SRE endpoints bypass version checks."""
    response = client.get("/")
    assert response.status_code == 200
    
    response = client.get("/health/live")
    assert response.status_code == 200

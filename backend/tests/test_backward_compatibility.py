def test_backward_compatibility_v1_get(client):
    """Verify that old clients requesting standard endpoints without idempotency/rate limit headers continue working."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-RateLimit-Limit") is not None
    assert response.headers.get("Idempotency-Cache") is None


def test_backward_compatibility_auth_login_fail(client):
    """Verify that authentication fails gracefully with a 401 instead of raising middleware exceptions."""
    # Attempting to login with incorrect credentials should return 401 client error
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nonexistent@company.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

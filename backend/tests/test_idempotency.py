import pytest
from unittest.mock import PropertyMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.middleware.idempotency import IdempotencyMiddleware


class StatefulMockRedis:
    """In-memory stateful mock for Redis client to test idempotency logic."""

    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def set(self, key, value, nx=False, ex=None):
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True

    def delete(self, key):
        if key in self.store:
            del self.store[key]
            return 1
        return 0


# Set up a dedicated test application
idempotency_app = FastAPI()
idempotency_app.add_middleware(IdempotencyMiddleware)

execution_counter = 0


@idempotency_app.post("/test-idempotent")
def sample_post_endpoint():
    global execution_counter
    execution_counter += 1
    return {"counter": execution_counter}


@idempotency_app.get("/test-idempotent")
def sample_get_endpoint():
    global execution_counter
    execution_counter += 1
    return {"counter": execution_counter}


@pytest.fixture
def stateful_redis():
    """Patches RedisClient.client with a stateful mock."""
    mock_db = StatefulMockRedis()
    with patch(
        "app.cache.redis_client.RedisClient.client", new_callable=PropertyMock
    ) as mock_prop:
        mock_prop.return_value = mock_db
        yield mock_db


def test_idempotency_workflow(stateful_redis):
    """Verify that multiple POST requests with identical Idempotency-Key return cached response."""
    global execution_counter
    execution_counter = 0  # Reset counter

    client = TestClient(idempotency_app)
    headers = {"Idempotency-Key": "test-uuid-1234"}

    # First request
    response1 = client.post("/test-idempotent", headers=headers)
    assert response1.status_code == 200
    assert response1.json() == {"counter": 1}
    assert response1.headers.get("Idempotency-Cache") is None
    assert execution_counter == 1

    # Duplicate request
    response2 = client.post("/test-idempotent", headers=headers)
    assert response2.status_code == 200
    assert response2.json() == {"counter": 1}  # Returns cached response
    assert response2.headers.get("Idempotency-Cache") == "HIT"
    assert execution_counter == 1  # Counter should not increment


def test_idempotency_ignored_on_get(stateful_redis):
    """Verify that GET requests ignore Idempotency-Key and are not cached."""
    global execution_counter
    execution_counter = 0

    client = TestClient(idempotency_app)
    headers = {"Idempotency-Key": "test-uuid-5678"}

    # First GET
    response1 = client.get("/test-idempotent", headers=headers)
    assert response1.status_code == 200
    assert response1.json() == {"counter": 1}
    assert response1.headers.get("Idempotency-Cache") is None

    # Second GET
    response2 = client.get("/test-idempotent", headers=headers)
    assert response2.status_code == 200
    assert response2.json() == {"counter": 2}  # Incremented
    assert response2.headers.get("Idempotency-Cache") is None

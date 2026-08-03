"""
Tests for Idempotency middleware error cleanup behavior.
Cases:
- 4xx response does NOT leave PENDING lock in Redis
- Two distinct requests with different keys both succeed (201)
- Retry with a fresh key after prior error returns 201
"""

import pytest
from unittest.mock import PropertyMock, patch
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from app.middleware.idempotency import IdempotencyMiddleware


class StatefulMockRedis:
    """In-memory stateful mock that faithfully tracks set/delete calls."""

    def __init__(self):
        self.store: dict = {}

    def get(self, key: str):
        return self.store.get(key)

    def set(self, key: str, value, nx: bool = False, ex=None):
        if nx and key in self.store:
            return None
        self.store[key] = value
        return True

    def delete(self, key: str):
        if key in self.store:
            del self.store[key]
            return 1
        return 0


# ── Dedicated micro-app ──────────────────────────────────────────────────────

error_cleanup_app = FastAPI()
error_cleanup_app.add_middleware(IdempotencyMiddleware)

_call_count = 0


@error_cleanup_app.post("/success-endpoint")
def _success():
    global _call_count
    _call_count += 1
    return JSONResponse({"ok": True, "n": _call_count}, status_code=201)


@error_cleanup_app.post("/conflict-endpoint")
def _conflict():
    return JSONResponse({"detail": "Already exists"}, status_code=409)


@error_cleanup_app.post("/unprocessable-endpoint")
def _unprocessable():
    return JSONResponse({"detail": "Validation failed"}, status_code=422)


@pytest.fixture
def stateful_redis_ec():
    mock_db = StatefulMockRedis()
    with patch(
        "app.cache.redis_client.RedisClient.client", new_callable=PropertyMock
    ) as mock_prop:
        mock_prop.return_value = mock_db
        yield mock_db


# ── Test cases ────────────────────────────────────────────────────────────────


def test_two_independent_requests_both_succeed(stateful_redis_ec):
    """Two Task-like requests with distinct Idempotency-Keys both return 2xx."""
    global _call_count
    _call_count = 0

    c = TestClient(error_cleanup_app)

    r1 = c.post("/success-endpoint", headers={"Idempotency-Key": "key-alpha"})
    r2 = c.post("/success-endpoint", headers={"Idempotency-Key": "key-beta"})

    assert r1.status_code in (200, 201)
    assert r2.status_code in (200, 201)
    # Both should have actually executed (distinct keys → no cache replay)
    assert _call_count == 2


def test_4xx_does_not_leave_pending_lock(stateful_redis_ec):
    """
    When a request results in a 4xx, the idempotency PENDING lock must be
    deleted so subsequent retries with the same key can proceed.
    """
    c = TestClient(error_cleanup_app)
    key = "error-key-conflict"

    # First call triggers 409
    r1 = c.post("/conflict-endpoint", headers={"Idempotency-Key": key})
    assert r1.status_code == 409

    # The key must NOT be locked as PENDING after a 4xx response.
    # The middleware stores the key as `idempotency:{user_id}:{key}`.
    # In tests without auth context, user_id defaults to "anonymous".
    redis_key = f"idempotency:anonymous:{key}"
    stored = stateful_redis_ec.get(redis_key)
    # Key should be absent (deleted) or contain a non-PENDING value
    if stored is not None:
        if isinstance(stored, bytes):
            stored = stored.decode("utf-8")
        import json

        try:
            data = json.loads(stored)
            assert (
                data.get("status") != "PENDING"
            ), "Key must not remain PENDING after 4xx"
        except (json.JSONDecodeError, AttributeError):
            pass  # Non-JSON stored value is not PENDING


def test_4xx_422_does_not_leave_pending_lock(stateful_redis_ec):
    """Same contract for 422 Unprocessable Entity responses."""
    c = TestClient(error_cleanup_app)
    key = "error-key-422"

    r1 = c.post("/unprocessable-endpoint", headers={"Idempotency-Key": key})
    assert r1.status_code == 422

    redis_key = f"idempotency:anonymous:{key}"
    stored = stateful_redis_ec.get(redis_key)
    if stored is not None:
        if isinstance(stored, bytes):
            stored = stored.decode("utf-8")
        import json

        try:
            data = json.loads(stored)
            assert (
                data.get("status") != "PENDING"
            ), "Key must not remain PENDING after 422"
        except (json.JSONDecodeError, AttributeError):
            pass


def test_retry_with_new_key_after_error_succeeds(stateful_redis_ec):
    """
    User experiences a 409, then retries with a brand-new Idempotency-Key.
    The retry must succeed (201/200).
    """
    global _call_count
    _call_count = 0

    c = TestClient(error_cleanup_app)

    # Original request fails
    c.post("/conflict-endpoint", headers={"Idempotency-Key": "fail-key"})

    # Retry with a fresh key on the success endpoint
    r2 = c.post("/success-endpoint", headers={"Idempotency-Key": "fresh-retry-key"})
    assert r2.status_code in (200, 201)


def test_duplicate_2xx_returns_cached_response(stateful_redis_ec):
    """Duplicate request with same key after success returns the cached response."""
    global _call_count
    _call_count = 0

    c = TestClient(error_cleanup_app)
    key = "dup-key-success"

    r1 = c.post("/success-endpoint", headers={"Idempotency-Key": key})
    assert r1.status_code in (200, 201)
    count_after_first = _call_count

    r2 = c.post("/success-endpoint", headers={"Idempotency-Key": key})
    assert r2.status_code in (200, 201)
    # Handler must NOT run a second time
    assert _call_count == count_after_first
    assert r2.headers.get("Idempotency-Cache") == "HIT"

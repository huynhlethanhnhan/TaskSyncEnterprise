import pytest
from unittest.mock import PropertyMock, patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.middleware.rate_limit import RateLimitMiddleware

class MockRateLimitRedis:
    """Stateful mock for Redis Sorted Set (ZSET) commands."""
    def __init__(self):
        self.store = {}

    def zremrangebyscore(self, key, min_score, max_score):
        if key not in self.store:
            return 0
        original_len = len(self.store[key])
        self.store[key] = [score for score in self.store[key] if score > max_score]
        return original_len - len(self.store[key])

    def zcard(self, key):
        return len(self.store.get(key, []))

    def zadd(self, key, mapping):
        if key not in self.store:
            self.store[key] = []
        for val, score in mapping.items():
            self.store[key].append(score)
        self.store[key].sort()
        return len(mapping)

    def expire(self, key, seconds):
        return True

    def zrange(self, key, start, end, withscores=False):
        if key not in self.store or not self.store[key]:
            return []
        oldest_score = self.store[key][0]
        if withscores:
            return [("member", oldest_score)]
        return ["member"]

    def pipeline(self):
        return MockPipeline(self)


class MockPipeline:
    def __init__(self, redis_mock):
        self.redis_mock = redis_mock
        self.commands = []

    def zremrangebyscore(self, key, min_val, max_val):
        self.commands.append(("zrem", key, min_val, max_val))
        return self

    def zcard(self, key):
        self.commands.append(("zcard", key))
        return self

    def zadd(self, key, mapping):
        self.commands.append(("zadd", key, mapping))
        return self

    def expire(self, key, ttl):
        self.commands.append(("expire", key, ttl))
        return self

    def execute(self):
        results = []
        for cmd in self.commands:
            op = cmd[0]
            if op == "zrem":
                results.append(self.redis_mock.zremrangebyscore(cmd[1], cmd[2], cmd[3]))
            elif op == "zcard":
                results.append(self.redis_mock.zcard(cmd[1]))
            elif op == "zadd":
                results.append(self.redis_mock.zadd(cmd[1], cmd[2]))
            elif op == "expire":
                results.append(self.redis_mock.expire(cmd[1], cmd[2]))
        self.commands = []
        return results


# Setup test app
test_app = FastAPI()
test_app.add_middleware(RateLimitMiddleware)

# Rename to avoid pytest collection warning
@test_app.get("/api/v1/test-route")
def sample_rate_limit_route():
    return {"message": "Success"}


@pytest.fixture
def rate_limit_redis():
    mock_db = MockRateLimitRedis()
    with patch("app.cache.redis_client.RedisClient.client", new_callable=PropertyMock) as mock_prop:
        mock_prop.return_value = mock_db
        yield mock_db


def test_rate_limiting_enforcement(rate_limit_redis):
    """Verify that requests are rate limited and return 429 after exceeding limit."""
    # Mock the settings object imported inside the middleware module
    mock_settings = MagicMock()
    mock_settings.API_V1_STR = "/api/v1"
    mock_settings.RATE_LIMIT_ENABLED = True
    mock_settings.RATE_LIMIT_DEFAULT_LIMIT = 3
    mock_settings.RATE_LIMIT_DEFAULT_WINDOW = 10

    with patch("app.middleware.rate_limit.settings", mock_settings):
        client = TestClient(test_app)
        
        # 1st request -> Success
        response = client.get("/api/v1/test-route")
        assert response.status_code == 200
        assert response.headers.get("X-RateLimit-Limit") == "3"
        assert response.headers.get("X-RateLimit-Remaining") == "2"

        # 2nd request -> Success
        response = client.get("/api/v1/test-route")
        assert response.status_code == 200
        assert response.headers.get("X-RateLimit-Remaining") == "1"

        # 3rd request -> Success
        response = client.get("/api/v1/test-route")
        assert response.status_code == 200
        assert response.headers.get("X-RateLimit-Remaining") == "0"

        # 4th request -> 429 Too Many Requests
        response = client.get("/api/v1/test-route")
        assert response.status_code == 429
        assert response.headers.get("Retry-After") is not None
        data = response.json()
        assert data["success"] is False
        assert data["error_code"] == "RATE_LIMIT_EXCEEDED"

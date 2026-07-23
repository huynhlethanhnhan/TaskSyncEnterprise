# 📂 FILE: backend/tests/test_cache_manager.py
import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel, ConfigDict
import redis
from app.cache import CacheManager, CacheService, RedisClient


@pytest.fixture(autouse=True)
def cleanup_redis_singleton():
    """Ensure RedisClient singleton is reset after each test to prevent test contamination."""
    yield
    RedisClient._instance = None


class FakeORMModel:
    """Mock database ORM model resembling SQLAlchemy model."""

    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name


class MockSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


@patch("app.cache.redis_client.redis.Redis")
def test_cache_manager_hit(mock_redis_class):
    """Verify that a cache hit retrieves cached value immediately without invoking database queries."""
    mock_client = MagicMock()
    mock_client.get.return_value = '{"id": 1, "name": "Cached Item"}'

    mock_redis_class.return_value = mock_client
    client_manager = RedisClient()
    client_manager._client = mock_client

    cache_service = CacheService(client_manager=client_manager)
    manager = CacheManager(cache_service=cache_service)

    db_query = MagicMock()
    db_query.return_value = FakeORMModel(id=1, name="Database Item")

    result = manager.cache_model(
        key="test_hit_key", creator_fn=db_query, ttl=100, response_model=MockSchema
    )

    # Assertions
    assert isinstance(result, MockSchema)
    assert result.id == 1
    assert result.name == "Cached Item"
    db_query.assert_not_called()
    mock_client.get.assert_called_with("test_hit_key")


@patch("app.cache.redis_client.redis.Redis")
def test_cache_manager_miss(mock_redis_class):
    """Verify that a cache miss evaluates db query, populates the cache and returns the value."""
    mock_client = MagicMock()
    mock_client.get.return_value = None

    mock_redis_class.return_value = mock_client
    client_manager = RedisClient()
    client_manager._client = mock_client

    cache_service = CacheService(client_manager=client_manager)
    manager = CacheManager(cache_service=cache_service)

    db_item = FakeORMModel(id=10, name="DB Item")
    db_query = MagicMock()
    db_query.return_value = db_item

    result = manager.cache_model(
        key="test_miss_key", creator_fn=db_query, ttl=500, response_model=MockSchema
    )

    # Assertions
    assert result is db_item
    db_query.assert_called_once()
    mock_client.get.assert_called_with("test_miss_key")
    # Verify setex gets called with serialized model representation
    mock_client.setex.assert_called_once_with(
        "test_miss_key", 500, '{"id":10,"name":"DB Item"}'
    )


@patch("app.cache.redis_client.redis.Redis")
def test_cache_manager_redis_unavailable(mock_redis_class):
    """Verify that cache manager gracefully bypasses cache on Redis failure, logging and returning DB data."""
    mock_client = MagicMock()
    mock_client.get.side_effect = redis.exceptions.ConnectionError("Redis offline")

    mock_redis_class.return_value = mock_client
    client_manager = RedisClient()
    client_manager._client = mock_client

    cache_service = CacheService(client_manager=client_manager)
    manager = CacheManager(cache_service=cache_service)

    db_item = FakeORMModel(id=99, name="Direct DB Item")
    db_query = MagicMock()
    db_query.return_value = db_item

    # Run test under patched logger to check warning/error outputs
    with patch("app.cache.cache_service.logger") as mock_service_logger:
        result = manager.cache_model(
            key="bypass_key", creator_fn=db_query, ttl=3600, response_model=MockSchema
        )

        assert result is db_item
        db_query.assert_called_once()
        # Verify logger captures Redis outage warn/error details
        mock_service_logger.error.assert_called_once()


@patch("app.cache.redis_client.redis.Redis")
def test_cache_manager_collection_serialization(mock_redis_class):
    """Verify that cache manager accurately serializes and reconstructs a collection list of models."""
    mock_client = MagicMock()
    mock_client.get.return_value = (
        '[{"id": 1, "name": "Item A"}, {"id": 2, "name": "Item B"}]'
    )

    mock_redis_class.return_value = mock_client
    client_manager = RedisClient()
    client_manager._client = mock_client

    cache_service = CacheService(client_manager=client_manager)
    manager = CacheManager(cache_service=cache_service)

    db_query = MagicMock()

    result = manager.cache_collection(
        key="collection_key",
        creator_fn=db_query,
        ttl=3600,
        response_model=list[MockSchema],
    )

    # Assertions
    assert isinstance(result, list)
    assert len(result) == 2
    assert all(isinstance(x, MockSchema) for x in result)
    assert result[0].name == "Item A"
    assert result[1].id == 2
    db_query.assert_not_called()

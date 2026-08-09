# 📂 FILE: backend/tests/test_cache.py
import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel
import redis
from app.cache import (
    RedisClient,
    CacheService,
    get_department_key,
    get_department_list_key,
    get_employee_key,
    get_employee_list_key,
    get_employee_search_key,
    get_project_key,
    get_project_list_key,
    get_role_key,
    get_role_list_key,
    get_dashboard_summary_key,
    get_dashboard_analytics_key,
    get_task_list_key,
    CacheSerializationError,
)


@pytest.fixture(autouse=True)
def cleanup_redis_singleton():
    """Ensure RedisClient singleton is reset after each test to prevent test contamination."""
    yield
    RedisClient._instance = None


class MockModel(BaseModel):
    id: int
    name: str


def test_redis_client_singleton():
    """Verify that RedisClient implements the Singleton pattern."""
    client1 = RedisClient()
    client2 = RedisClient()
    assert client1 is client2


def test_cache_keys():
    """Verify key generation naming conventions match specification."""
    assert get_department_key(5) == "department:5"
    assert get_department_list_key(0, 20, "HR") == "department:list:0:20:s_HR"
    assert get_employee_key(10) == "employee:10"
    assert get_employee_list_key(5, 10) == "employee:list:5:10"
    assert (
        get_employee_list_key(5, 10, "department_7")
        == "employee:list:5:10:scope_department_7"
    )
    assert get_employee_search_key("John") == "employee:search:John"
    assert get_project_key(7) == "project:7"
    assert get_project_list_key(0, 10) == "project:list:0:10"
    assert get_role_key(2) == "role:2"
    assert get_role_list_key() == "role:list"
    assert get_dashboard_summary_key() == "dashboard:summary"
    assert get_dashboard_analytics_key() == "dashboard:analytics"
    assert get_task_list_key(0, 20, 3, "Done") == "task:list:0:20:p_3:s_Done"


@patch("app.cache.redis_client.redis.Redis")
def test_cache_service_set(mock_redis_class):
    """Verify set serializes primitives and Pydantic models correctly with appropriate TTL."""
    mock_client = MagicMock()
    mock_redis_class.return_value = mock_client

    # Force client manager to re-init with mocked client
    client_manager = RedisClient()
    client_manager._client = mock_client

    cache = CacheService(client_manager=client_manager)

    # 1. Test set primitive with custom TTL
    assert cache.set("test_key_primitive", {"a": 1}, ttl=100) is True
    mock_client.setex.assert_called_once_with("test_key_primitive", 100, '{"a": 1}')
    mock_client.reset_mock()

    # 2. Test set Pydantic model with default TTL
    model_instance = MockModel(id=1, name="John")
    assert cache.set("test_key_model", model_instance) is True
    # The default TTL will be pulled from config (usually 3600 seconds)
    mock_client.setex.assert_called_once()
    args, kwargs = mock_client.setex.call_args
    assert args[0] == "test_key_model"
    assert args[1] > 0
    assert args[2] == '{"id":1,"name":"John"}'


@patch("app.cache.redis_client.redis.Redis")
def test_cache_service_get(mock_redis_class):
    """Verify get returns deserialized primitives, models, and lists of models correctly."""
    mock_client = MagicMock()
    mock_redis_class.return_value = mock_client

    client_manager = RedisClient()
    client_manager._client = mock_client

    cache = CacheService(client_manager=client_manager)

    # 1. Test get missing key
    mock_client.get.return_value = None
    assert cache.get("missing_key") is None
    mock_client.get.assert_called_with("missing_key")

    # 2. Test get primitive object
    mock_client.get.return_value = '{"x": 100}'
    assert cache.get("key_primitive") == {"x": 100}

    # 3. Test get single Pydantic model
    mock_client.get.return_value = '{"id": 42, "name": "Alice"}'
    model_res = cache.get("key_model", response_model=MockModel)
    assert isinstance(model_res, MockModel)
    assert model_res.id == 42
    assert model_res.name == "Alice"

    # 4. Test get list of Pydantic models (using TypeAdapter support)
    mock_client.get.return_value = '[{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]'
    list_res = cache.get("key_list", response_model=list[MockModel])
    assert isinstance(list_res, list)
    assert len(list_res) == 2
    assert all(isinstance(x, MockModel) for x in list_res)
    assert list_res[0].id == 1
    assert list_res[1].name == "B"


@patch("app.cache.redis_client.redis.Redis")
def test_cache_service_delete_exists_expire(mock_redis_class):
    """Verify delete, exists, and expire call correct Redis methods."""
    mock_client = MagicMock()
    mock_redis_class.return_value = mock_client

    client_manager = RedisClient()
    client_manager._client = mock_client
    cache = CacheService(client_manager=client_manager)

    # 1. Delete
    mock_client.delete.return_value = 1
    assert cache.delete("del_key") is True
    mock_client.delete.assert_called_once_with("del_key")

    # 2. Exists
    mock_client.exists.return_value = 1
    assert cache.exists("exist_key") is True
    mock_client.exists.assert_called_once_with("exist_key")

    # 3. Expire
    mock_client.expire.return_value = True
    assert cache.expire("exp_key", 50) is True
    mock_client.expire.assert_called_once_with("exp_key", 50)


@patch("app.cache.redis_client.redis.Redis")
def test_cache_service_clear_pattern(mock_redis_class):
    """Verify clear_pattern safely scans and deletes keys iteratively."""
    mock_client = MagicMock()
    mock_redis_class.return_value = mock_client

    client_manager = RedisClient()
    client_manager._client = mock_client
    cache = CacheService(client_manager=client_manager)

    # Mock scanning returns keys in batches
    mock_client.scan.side_effect = [
        (1, ["cache:k1", "cache:k2"]),
        (0, ["cache:k3"]),
    ]
    mock_client.delete.return_value = 3

    assert cache.clear_pattern("cache:*") is True
    assert mock_client.scan.call_count == 2
    assert mock_client.delete.call_count == 2
    # Verify scan args
    mock_client.scan.assert_any_call(cursor=0, match="cache:*", count=100)
    mock_client.scan.assert_any_call(cursor=1, match="cache:*", count=100)


@patch("app.cache.redis_client.redis.Redis")
def test_cache_service_fail_silent_on_redis_error(mock_redis_class):
    """Verify that CacheService handles connection losses gracefully without raising exceptions."""
    mock_client = MagicMock()
    mock_redis_class.return_value = mock_client

    # Mock redis commands raising connection errors
    mock_client.get.side_effect = redis.exceptions.ConnectionError("Redis down")
    mock_client.set.side_effect = redis.exceptions.ConnectionError("Redis down")
    mock_client.setex.side_effect = redis.exceptions.ConnectionError("Redis down")
    mock_client.delete.side_effect = redis.exceptions.ConnectionError("Redis down")

    client_manager = RedisClient()
    client_manager._client = mock_client
    cache = CacheService(client_manager=client_manager)

    # CacheService must return None/False without crashing the business workflow
    assert cache.get("any_key") is None
    assert cache.set("any_key", "value") is False
    assert cache.delete("any_key") is False

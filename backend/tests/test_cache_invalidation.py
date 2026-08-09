# 📂 FILE: backend/tests/test_cache_invalidation.py
import logging
import pytest
from unittest.mock import MagicMock, patch
from app.cache import CacheInvalidator, cache_service, cache_keys


@pytest.fixture(autouse=True)
def reset_redis_singleton():
    from app.cache.redis_client import RedisClient
    from app.cache import cache_service

    RedisClient._instance = None
    if hasattr(cache_service, "client_manager"):
        cache_service.client_manager._client = None
        cache_service.client_manager._pool = None
        cache_service.client_manager._offline_until = 0.0
    yield
    RedisClient._instance = None
    if hasattr(cache_service, "client_manager"):
        cache_service.client_manager._client = None
        cache_service.client_manager._pool = None
        cache_service.client_manager._offline_until = 0.0


@pytest.fixture
def mock_redis():
    """Provides a configured mock Redis client with standard return values."""
    with patch("app.cache.redis_client.redis.Redis") as mock_redis_class:
        mock_client = MagicMock()
        mock_redis_class.return_value = mock_client
        mock_client.ping.return_value = True
        mock_client.delete.return_value = 1
        mock_client.scan.return_value = (0, [])
        mock_client.exists.return_value = 0
        mock_client.set.return_value = True
        mock_client.setex.return_value = True
        yield mock_client


def test_pattern_deletion(mock_redis):
    """Verify that SCAN-based pattern deletion is triggered and uses SCAN instead of KEYS."""
    # Override scan return value for this test
    mock_redis.scan.side_effect = [(1, ["k1", "k2"]), (0, ["k3"])]

    success = cache_service.clear_pattern("test:*")
    assert success is True

    # Assert scan was called with cursors
    assert mock_redis.scan.call_count == 2
    mock_redis.scan.assert_any_call(cursor=0, match="test:*", count=100)
    mock_redis.scan.assert_any_call(cursor=1, match="test:*", count=100)

    # Assert deletes were called on the returned keys
    assert mock_redis.delete.call_count == 2
    mock_redis.delete.assert_any_call("k1", "k2")
    mock_redis.delete.assert_any_call("k3")


def test_dashboard_invalidation(mock_redis):
    """Verify dashboard invalidation clears pattern dashboard:* via SCAN."""
    CacheInvalidator.invalidate_dashboard()

    # Should delete keys matching pattern dashboard:*
    mock_redis.scan.assert_any_call(cursor=0, match="dashboard:*", count=100)


def test_employee_update_invalidation(mock_redis):
    """Verify employee update invalidates profile key, list keys, search keys, department lists, and dashboard."""
    CacheInvalidator.invalidate_employee(employee_id=42)

    # 1. Invalidate specific employee
    mock_redis.delete.assert_any_call(cache_keys.get_employee_key(42))

    # 2. Invalidate lists and search patterns via SCAN
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_employee_list_pattern(), count=100
    )
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_employee_search_pattern(), count=100
    )
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_department_list_pattern(), count=100
    )

    # 3. Invalidate dashboard
    mock_redis.scan.assert_any_call(cursor=0, match="dashboard:*", count=100)


def test_department_delete_invalidation(mock_redis):
    """Verify department delete invalidates specific key, department lists, and dashboard."""
    CacheInvalidator.invalidate_department(department_id=10)

    # Invalidate key
    mock_redis.delete.assert_any_call(cache_keys.get_department_key(10))

    # Invalidate list patterns
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_department_list_pattern(), count=100
    )

    # Invalidate dashboard
    mock_redis.scan.assert_any_call(cursor=0, match="dashboard:*", count=100)


def test_project_create_invalidation(mock_redis):
    """Verify project creation invalidates project list pattern and dashboard."""
    CacheInvalidator.invalidate_project(project_id=None)

    # Invalidate lists pattern
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_project_list_pattern(), count=100
    )

    # Invalidate dashboard
    mock_redis.scan.assert_any_call(cursor=0, match="dashboard:*", count=100)


def test_task_update_invalidation(mock_redis):
    """Verify task update triggers cascading invalidations on task details, lists, associated project/employee and dashboard."""
    CacheInvalidator.invalidate_task(task_id=101, project_id=7, employee_id=15)

    # Invalidate specific task
    mock_redis.delete.assert_any_call(cache_keys.get_task_key(101))

    # Invalidate task list pattern
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_task_list_pattern(), count=100
    )

    # Invalidate associated project
    mock_redis.delete.assert_any_call(cache_keys.get_project_key(7))
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_project_list_pattern(), count=100
    )

    # Invalidate associated employee
    mock_redis.delete.assert_any_call(cache_keys.get_employee_key(15))
    mock_redis.scan.assert_any_call(
        cursor=0, match=cache_keys.get_employee_list_pattern(), count=100
    )

    # Invalidate dashboard
    mock_redis.scan.assert_any_call(cursor=0, match="dashboard:*", count=100)


def test_invalidation_with_integer_delete_result_does_not_log_exception(
    mock_redis, caplog
):
    caplog.set_level(logging.ERROR, logger="cache")

    CacheInvalidator.invalidate_task(task_id=101)

    assert not [record for record in caplog.records if record.levelno >= logging.ERROR]


def test_redis_unavailable():
    """Verify that if Redis is offline/unavailable, CacheInvalidator fails silently without throwing errors."""
    from unittest.mock import PropertyMock

    with patch(
        "app.cache.redis_client.RedisClient.client",
        new_callable=PropertyMock,
        return_value=None,
    ):
        # Invalidation should run without throwing exception
        try:
            CacheInvalidator.invalidate_employee(employee_id=99)
            CacheInvalidator.invalidate_task(task_id=10)
        except Exception as e:
            pytest.fail(
                f"CacheInvalidator failed to fail-silently. Threw exception: {e}"
            )


def test_bulk_invalidation(mock_redis):
    """Verify bulk invalidation evicts lists of multiple key combinations properly."""
    CacheInvalidator.invalidate_employee(1)
    CacheInvalidator.invalidate_employee(2)

    mock_redis.delete.assert_any_call(cache_keys.get_employee_key(1))
    mock_redis.delete.assert_any_call(cache_keys.get_employee_key(2))

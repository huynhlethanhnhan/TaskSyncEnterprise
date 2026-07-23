# 📂 FILE: app/cache/__init__.py
from app.cache.redis_client import RedisClient
from app.cache.cache_service import CacheService
from app.cache.cache_manager import CacheManager
from app.cache.cache_invalidator import CacheInvalidator
from app.cache.exceptions import (
    CacheError,
    CacheConnectionError,
    CacheSerializationError,
)
from app.cache.cache_keys import (
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
    get_task_key,
    get_department_list_pattern,
    get_employee_list_pattern,
    get_employee_search_pattern,
    get_project_list_pattern,
    get_task_list_pattern,
)

# Global singleton CacheService & CacheManager instances for application reuse
cache_service = CacheService()
cache_manager = CacheManager(cache_service=cache_service)

__all__ = [
    "RedisClient",
    "CacheService",
    "CacheManager",
    "CacheInvalidator",
    "cache_service",
    "cache_manager",
    "CacheError",
    "CacheConnectionError",
    "CacheSerializationError",
    "get_department_key",
    "get_department_list_key",
    "get_employee_key",
    "get_employee_list_key",
    "get_employee_search_key",
    "get_project_key",
    "get_project_list_key",
    "get_role_key",
    "get_role_list_key",
    "get_dashboard_summary_key",
    "get_dashboard_analytics_key",
    "get_task_list_key",
    "get_task_key",
    "get_department_list_pattern",
    "get_employee_list_pattern",
    "get_employee_search_pattern",
    "get_project_list_pattern",
    "get_task_list_pattern",
]

# 📂 FILE: app/cache/cache_manager.py
import logging
from typing import Any, Callable, Optional, Type, TypeVar, List
from pydantic import BaseModel, TypeAdapter
from app.cache.cache_service import CacheService
from app.config import settings

logger = logging.getLogger("cache")

T = TypeVar("T")


class CacheManager:
    """
    High-level cache manager orchestrating read-through caching patterns.
    Acts as the main entry point for cache-aware queries in the system.
    """

    def __init__(self, cache_service: Optional[CacheService] = None) -> None:
        from app.cache import cache_service as default_cache_service

        self.cache = cache_service or default_cache_service

    def get_or_set(
        self,
        key: str,
        creator_fn: Callable[[], Any],
        ttl: Optional[int] = None,
        response_model: Optional[Type[T]] = None,
    ) -> T:
        """
        Generic read-through caching workflow.
        Checks cache for 'key'. If found, returns the deserialized data.
        On miss, executes 'creator_fn' to load from DB, caches the validated result, and returns it.
        """
        # 1. Attempt to fetch from Redis
        try:
            cached_val = self.cache.get(key, response_model=response_model)
            if cached_val is not None:
                return cached_val
        except Exception as e:
            # Bypassed on lookup errors, fall back to database query
            logger.error(
                "Redis Connection Error",
                extra={
                    "operation": "CONNECTION_ERROR",
                    "error": f"Cache lookup bypassed due to error: {e}",
                },
            )

        # 2. Cache Miss - Retrieve data from source (Database)
        logger.info("Cache Miss", extra={"operation": "MISS", "key": key})

        value = creator_fn()

        # 3. Cache the value (Skip caching if None to prevent caching non-existent keys)
        if value is not None:
            # Set default TTL if not specified
            if ttl is None:
                ttl = settings.CACHE_TTL_DEFAULT

            try:
                # If a response model is specified, validate and serialize it using TypeAdapter
                # to handle potential SQLAlchemy models and complex structures cleanly.
                if response_model is not None:
                    adapter = TypeAdapter(response_model)
                    validated_value = adapter.validate_python(value)
                    serialized_val = adapter.dump_json(validated_value).decode("utf-8")
                    # Bypass standard cache serialization as it is already JSON-formatted
                    client = self.cache._get_client()
                    if client:
                        if ttl > 0:
                            client.setex(key, ttl, serialized_val)
                        else:
                            client.set(key, serialized_val)
                        logger.info(
                            "Cache Populate",
                            extra={"operation": "POPULATE", "key": key, "ttl": ttl},
                        )
                else:
                    self.cache.set(key, value, ttl=ttl)
                    logger.info(
                        "Cache Populate",
                        extra={"operation": "POPULATE", "key": key, "ttl": ttl},
                    )
            except Exception as e:
                logger.error(
                    "Redis Connection Error",
                    extra={
                        "operation": "CONNECTION_ERROR",
                        "error": f"Failed to populate cache key '{key}': {e}",
                    },
                )

        return value

    def get_or_create(
        self,
        key: str,
        creator_fn: Callable[[], Any],
        ttl: Optional[int] = None,
        response_model: Optional[Type[T]] = None,
    ) -> T:
        """Alias for get_or_set supporting get_or_create terminology."""
        return self.get_or_set(key, creator_fn, ttl=ttl, response_model=response_model)

    def cache_model(
        self,
        key: str,
        creator_fn: Callable[[], Any],
        ttl: Optional[int] = None,
        response_model: Optional[Type[T]] = None,
    ) -> T:
        """Read-through helper specifically named for caching a single model instance."""
        return self.get_or_set(key, creator_fn, ttl=ttl, response_model=response_model)

    def cache_collection(
        self,
        key: str,
        creator_fn: Callable[[], List[Any]],
        ttl: Optional[int] = None,
        response_model: Optional[Type[List[T]]] = None,
    ) -> List[T]:
        """Read-through helper specifically named for caching a collection of models/objects."""
        return self.get_or_set(key, creator_fn, ttl=ttl, response_model=response_model)

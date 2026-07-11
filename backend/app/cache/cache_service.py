# 📂 FILE: app/cache/cache_service.py
import json
import logging
from datetime import datetime, date
from uuid import UUID
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel, TypeAdapter
import redis
from app.config import settings
from app.cache.redis_client import RedisClient
from app.cache.exceptions import CacheSerializationError

logger = logging.getLogger("cache")

T = TypeVar("T")


class CacheJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder to support datetime, date, and UUID serialization."""
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


class CacheService:
    """
    Core caching service providing JSON serialization, structured logging,
    and fail-silent policies for robust database caching.
    """
    def __init__(self, client_manager: Optional[RedisClient] = None) -> None:
        self.client_manager = client_manager or RedisClient()

    def _get_client(self) -> Optional[redis.Redis]:
        """Safely gets the Redis client, returning None if the server is unreachable."""
        try:
            return self.client_manager.client
        except Exception as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"Failed to retrieve client: {e}"
            })
            return None

    def get(self, key: str, response_model: Optional[Type[T]] = None) -> Optional[T]:
        """
        Retrieves a value from cache, optionally deserializing it to a Pydantic model
        or complex Python type via Pydantic TypeAdapter.
        Logs Cache Hit and Cache Miss events.
        """
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "key": key,
                "reason": "Redis is unavailable"
            })
            return None

        try:
            cached_val = client.get(key)
            if cached_val is None:
                logger.info("Cache Miss", extra={
                    "operation": "MISS",
                    "key": key
                })
                return None

            logger.info("Cache Hit", extra={
                "operation": "HIT",
                "key": key
            })

            # Deserialization
            if response_model is not None:
                try:
                    adapter = TypeAdapter(response_model)
                    return adapter.validate_json(cached_val)
                except Exception as e:
                    logger.error(f"Failed to deserialize cache key '{key}' to model {response_model}: {e}")
                    raise CacheSerializationError(f"Deserialization error: {e}") from e

            try:
                return json.loads(cached_val)
            except json.JSONDecodeError:
                # Return raw string if not valid JSON
                return cached_val

        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"get({key}) failed: {e}"
            })
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Stores a value in cache, serializing it to JSON.
        TTL defaults to system settings if not explicitly provided.
        """
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "key": key,
                "reason": "Redis is unavailable"
            })
            return False

        if ttl is None:
            ttl = settings.CACHE_TTL_DEFAULT

        try:
            # Serialization
            if isinstance(value, BaseModel):
                serialized_val = value.model_dump_json()
            else:
                try:
                    serialized_val = json.dumps(value, cls=CacheJSONEncoder)
                except Exception as e:
                    logger.error(f"Failed to serialize value for cache key '{key}': {e}")
                    raise CacheSerializationError(f"Serialization error: {e}") from e

            # Save with optional TTL
            if ttl > 0:
                client.setex(key, ttl, serialized_val)
            else:
                client.set(key, serialized_val)

            logger.info("Cache Set", extra={
                "operation": "SET",
                "key": key,
                "ttl": ttl
            })
            return True

        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"set({key}) failed: {e}"
            })
            return False

    def delete(self, key: str) -> bool:
        """Deletes a key from the cache. Logs Cache Delete event."""
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "key": key,
                "reason": "Redis is unavailable"
            })
            return False

        try:
            deleted_count = client.delete(key)
            logger.info("Cache Delete", extra={
                "operation": "DELETE",
                "key": key
            })
            return deleted_count > 0
        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"delete({key}) failed: {e}"
            })
            return False

    def exists(self, key: str) -> bool:
        """Checks if a key exists in the cache."""
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "key": key,
                "reason": "Redis is unavailable"
            })
            return False

        try:
            return bool(client.exists(key))
        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"exists({key}) failed: {e}"
            })
            return False

    def expire(self, key: str, ttl: int) -> bool:
        """Sets an expiration TTL (in seconds) for a key in the cache."""
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "key": key,
                "reason": "Redis is unavailable"
            })
            return False

        try:
            return bool(client.expire(key, ttl))
        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"expire({key}, {ttl}) failed: {e}"
            })
            return False

    def clear_pattern(self, pattern: str) -> bool:
        """
        Finds all keys matching a specific glob pattern and deletes them.
        Uses non-blocking SCAN instead of KEYS for production safety.
        """
        client = self._get_client()
        if not client:
            logger.warning("Cache Bypass", extra={
                "operation": "BYPASS",
                "pattern": pattern,
                "reason": "Redis is unavailable"
            })
            return False

        try:
            cursor = 0
            deleted_any = False
            while True:
                cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    client.delete(*keys)
                    deleted_any = True
                    for key in keys:
                        logger.info("Cache Delete", extra={
                            "operation": "DELETE",
                            "key": key
                        })
                if cursor == 0:
                    break
            return deleted_any
        except (redis.exceptions.RedisError, redis.exceptions.ConnectionError) as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"clear_pattern({pattern}) failed: {e}"
            })
            return False

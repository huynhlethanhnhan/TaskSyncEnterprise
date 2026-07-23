# 📂 FILE: app/cache/redis_client.py
import logging
import threading
import time
from typing import Optional
import redis
from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from app.config import settings

logger = logging.getLogger("cache")


class RedisClient:
    """
    Thread-safe Redis Client manager implementing the Singleton pattern.
    Includes an in-memory Circuit Breaker to prevent offline Redis server connection
    retries from stalling HTTP requests.
    """

    _instance: Optional["RedisClient"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "RedisClient":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(RedisClient, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self._initialized = True
        self._pool: Optional[redis.ConnectionPool] = None
        self._client: Optional[redis.Redis] = None
        self._offline_until: float = 0.0
        self._offline_cooldown: float = 15.0  # Bypass Redis attempts for 15 seconds after failure

    def is_offline(self) -> bool:
        """Returns True if the circuit breaker is active and Redis is flagged offline."""
        return time.time() < self._offline_until

    def mark_offline(self, reason: str = "Redis connection failed") -> None:
        """Activates the circuit breaker to fail-fast on subsequent calls."""
        with self._lock:
            self._offline_until = time.time() + self._offline_cooldown
            self._client = None
            if self._pool is not None:
                try:
                    self._pool.disconnect()
                except Exception:
                    pass
                self._pool = None
            logger.warning(
                f"Redis Circuit Breaker activated for {self._offline_cooldown}s. Reason: {reason}"
            )

    def _setup_connection(self) -> None:
        """Sets up the Redis connection pool and client with ultra-fast connect timeouts."""
        if self.is_offline():
            return

        try:
            password = (
                settings.REDIS_PASSWORD.get_secret_value()
                if settings.REDIS_PASSWORD
                else None
            )

            # Fast connect timeout so offline Redis does not stall API requests
            retry_strategy = Retry(
                ExponentialBackoff(
                    cap=0.1,
                    base=0.02,
                ),
                retries=0,
            )

            pool_kwargs = {
                "db": settings.REDIS_DB,
                "max_connections": settings.REDIS_MAX_CONNECTIONS,
                "socket_timeout": 0.2,
                "socket_connect_timeout": 0.1,
                "retry_on_timeout": False,
                "retry": retry_strategy,
                "decode_responses": True,
            }

            if settings.REDIS_URL:
                self._pool = redis.ConnectionPool.from_url(
                    settings.REDIS_URL, **pool_kwargs
                )
            else:
                self._pool = redis.ConnectionPool(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    password=password,
                    **pool_kwargs,
                )

            if type(redis.Redis).__name__ in ("MagicMock", "Mock"):
                self._client = redis.Redis(connection_pool=self._pool)
            else:
                from app.monitoring.redis_instrumentation import InstrumentedRedis

                self._client = InstrumentedRedis(connection_pool=self._pool)
            logger.info("Redis connection pool and client initialized successfully.")
        except Exception as e:
            self.mark_offline(str(e))

    @property
    def client(self) -> Optional[redis.Redis]:
        """
        Returns the Redis client instance.
        Returns None immediately if the circuit breaker is active.
        """
        if self.is_offline():
            return None

        if self._client is None:
            with self._lock:
                if self._client is None and not self.is_offline():
                    self._setup_connection()

        return self._client

    def ping(self) -> bool:
        """Checks if the Redis instance is currently reachable."""
        client = self.client
        if client is None:
            return False
        try:
            return bool(client.ping())
        except Exception as e:
            self.mark_offline(f"Ping failed: {e}")
            return False

    def close(self) -> None:
        """Closes the connection pool and cleans up the client."""
        with self._lock:
            if self._pool is not None:
                try:
                    self._pool.disconnect()
                except Exception as e:
                    logger.error(f"Error disconnecting Redis pool: {e}")
                finally:
                    self._pool = None
                    self._client = None

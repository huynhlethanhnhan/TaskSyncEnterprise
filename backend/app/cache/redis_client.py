# 📂 FILE: app/cache/redis_client.py
import logging
import threading
from typing import Optional
import redis
from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from app.config import settings

logger = logging.getLogger("cache")


class RedisClient:
    """
    Thread-safe Redis Client manager implementing the Singleton pattern.
    Provides connection pooling, automatic reconnect policies, and health check support.
    """
    _instance: Optional['RedisClient'] = None
    _lock = threading.Lock()

    def __new__(cls) -> 'RedisClient':
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
        self._setup_connection()

    def _setup_connection(self) -> None:
        """Sets up the Redis connection pool and client."""
        try:
            password = settings.REDIS_PASSWORD.get_secret_value() if settings.REDIS_PASSWORD else None
            
            # Configure exponential backoff retry strategy for automatic reconnects
            retry_strategy = Retry(
                ExponentialBackoff(
                    cap=2.0,  # Max backoff delay in seconds
                    base=0.1   # Initial backoff delay
                ),
                retries=settings.REDIS_RETRY_ATTEMPTS
            )
            
            pool_kwargs = {
                "db": settings.REDIS_DB,
                "max_connections": settings.REDIS_MAX_CONNECTIONS,
                "socket_timeout": settings.REDIS_TIMEOUT,
                "socket_connect_timeout": settings.REDIS_TIMEOUT,
                "retry_on_timeout": True,
                "retry": retry_strategy,
                "decode_responses": True,
            }
            
            if settings.REDIS_URL:
                # Direct URL override (useful for Docker/Staging/Production configurations)
                self._pool = redis.ConnectionPool.from_url(
                    settings.REDIS_URL,
                    **pool_kwargs
                )
            else:
                self._pool = redis.ConnectionPool(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    password=password,
                    **pool_kwargs
                )
            
            self._client = redis.Redis(connection_pool=self._pool)
            logger.info("Redis connection pool and client initialized successfully.")
        except Exception as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": str(e)
            }, exc_info=True)
            self._pool = None
            self._client = None

    @property
    def client(self) -> redis.Redis:
        """Returns the Redis client instance, attempting to re-initialize if connection is lost."""
        if self._client is None:
            with self._lock:
                if self._client is None:
                    self._setup_connection()
        if self._client is None:
            raise redis.exceptions.ConnectionError("Redis client is not initialized and connection attempt failed.")
        return self._client

    def ping(self) -> bool:
        """Checks if the Redis instance is currently reachable."""
        try:
            return bool(self.client.ping())
        except Exception as e:
            logger.error("Redis Connection Error", extra={
                "operation": "CONNECTION_ERROR",
                "error": f"Ping failed: {e}"
            })
            return False

    def close(self) -> None:
        """Closes the connection pool and cleans up the client."""
        with self._lock:
            if self._pool is not None:
                try:
                    self._pool.disconnect()
                    logger.info("Redis connection pool successfully disconnected.")
                except Exception as e:
                    logger.error(f"Error disconnecting Redis pool: {e}")
                finally:
                    self._pool = None
                    self._client = None

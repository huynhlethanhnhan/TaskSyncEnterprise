import time
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.cache.redis_client import RedisClient
from app.config import settings
from app.core.request_context import get_request_context

logger = logging.getLogger("rate_limit")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed Sliding Window Log Rate Limiter Middleware.
    Maintains client request timestamps in a Redis Sorted Set (ZSET)
    to enforce rolling request thresholds.
    """

    def __init__(self, app):
        super().__init__(app)
        self.redis_client_mgr = RedisClient()

    def _get_client(self):
        try:
            return self.redis_client_mgr.client
        except Exception as e:
            logger.error(f"Redis client is unavailable for rate limiter: {e}")
            return None

    async def dispatch(self, request: Request, call_next):
        # 1. Skip non-API routes (e.g. SRE /health checks, static uploads)
        if not request.url.path.startswith(settings.API_V1_STR):
            return await call_next(request)

        # 2. Check override flag
        enabled = getattr(settings, "RATE_LIMIT_ENABLED", True)
        if not enabled:
            return await call_next(request)

        client = self._get_client()
        if not client:
            logger.warning("Bypassing rate limit check because Redis is offline.")
            return await call_next(request)

        # 3. Resolve request context identity
        ctx = get_request_context()
        user_id = ctx.get("user_id") if ctx else None
        if not user_id or user_id == "-":
            identifier = request.client.host if request.client else "unknown_ip"
        else:
            identifier = f"user_{user_id}"

        # 4. Resolve limits & window
        limit = getattr(settings, "RATE_LIMIT_DEFAULT_LIMIT", 100)
        window = getattr(settings, "RATE_LIMIT_DEFAULT_WINDOW", 60)

        # 5. Build unique path-level ZSET key
        sanitized_path = request.url.path.replace(":", "_").replace("/", "_")
        redis_key = f"rate_limit:{identifier}:{sanitized_path}"

        current_time = time.time()
        window_start = current_time - window

        try:
            # Atomic sliding window updates using pipeline
            pipe = client.pipeline()
            pipe.zremrangebyscore(redis_key, "-inf", window_start)

            # Add element first to include it in the count
            val_str = f"{current_time}_{time.time_ns()}"
            pipe.zadd(redis_key, {val_str: current_time})

            # Count cardinality of ZSET after adding
            pipe.zcard(redis_key)
            pipe.expire(redis_key, window)

            results = pipe.execute()
            if isinstance(results, (list, tuple)) and len(results) >= 4:
                current_count = results[2]  # results[2] is the ZCARD count
            else:
                current_count = 1

            if current_count > limit:
                # Fetch oldest timestamp to calculate exact wait time
                oldest_elements = client.zrange(redis_key, 0, 0, withscores=True)
                if oldest_elements:
                    oldest_score = oldest_elements[0][1]
                    retry_after = int(max(1.0, window - (current_time - oldest_score)))
                else:
                    retry_after = window

                return JSONResponse(
                    status_code=429,
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                    content={
                        "success": False,
                        "message": "Too many requests. Please try again later.",
                        "error_code": "RATE_LIMIT_EXCEEDED",
                    },
                )

            # Normal path: append telemetry headers to the response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            remaining = max(0, limit - current_count)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response

        except Exception as e:
            logger.error(f"Rate limiting pipeline execution failed: {e}")
            return await call_next(request)

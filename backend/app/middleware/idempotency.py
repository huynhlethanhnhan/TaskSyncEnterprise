import base64
import json
import asyncio
from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.cache.redis_client import RedisClient
from app.config import settings
from app.core.request_context import get_request_context
from app.logging import app_logger as logger


def serialize_response(status_code: int, headers: dict, body: bytes) -> str:
    """Serializes response components to a JSON string, base64 encoding the body."""
    encoded_body = base64.b64encode(body).decode("utf-8")
    header_list = [(k, v) for k, v in headers.items()]
    return json.dumps(
        {
            "status": "COMPLETED",
            "status_code": status_code,
            "headers": header_list,
            "body": encoded_body,
        }
    )


def deserialize_response(cached_data_str: str) -> Response:
    """Reconstructs a Starlette Response from serialized cache data."""
    data = json.loads(cached_data_str)
    status_code = data["status_code"]
    headers = data["headers"]
    body = base64.b64decode(data["body"])

    reconstructed_headers = {}
    for k, v in headers:
        # Exclude dynamic or correlation headers
        if k.lower() in ("x-process-time", "date"):
            continue
        reconstructed_headers[k] = v

    # Mark cache hit indicators
    reconstructed_headers["Idempotency-Cache"] = "HIT"
    reconstructed_headers["X-Idempotency-Cache"] = "HIT"

    return Response(
        content=body, status_code=status_code, headers=reconstructed_headers
    )


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces idempotent POST, PUT, PATCH operations.
    Utilizes Redis to lock requests in a PENDING state and cache responses
    for identical Idempotency-Key values over a 24-hour window.
    """

    def __init__(self, app):
        super().__init__(app)
        self.redis_client_mgr = RedisClient()

    def _get_client(self):
        try:
            return self.redis_client_mgr.client
        except Exception as e:
            logger.error(f"Redis client is unavailable for idempotency middleware: {e}")
            return None

    async def dispatch(self, request: Request, call_next):
        # 1. Skip non-mutation methods
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        # 2. Extract Idempotency-Key
        idempotency_key = request.headers.get("idempotency-key")
        if not idempotency_key:
            return await call_next(request)

        client = self._get_client()
        if not client:
            logger.warning("Bypassing idempotency check because Redis is offline.")
            return await call_next(request)

        # 3. Retrieve user scope from context
        ctx = get_request_context()
        user_id = ctx.get("user_id", "anonymous") if ctx else "anonymous"

        # 4. Construct unique storage key
        redis_key = f"idempotency:{user_id}:{idempotency_key}"
        ttl = getattr(settings, "IDEMPOTENCY_TTL_SECONDS", 86400)  # Default 24 hours

        # 5. Acquire lock via SET NX
        pending_value = json.dumps({"status": "PENDING"})
        try:
            is_new = client.set(redis_key, pending_value, nx=True, ex=ttl)
        except Exception as redis_err:
            logger.warning(
                f"Bypassing idempotency check because Redis SET failed: {redis_err}"
            )
            self.redis_client_mgr.mark_offline(str(redis_err))
            return await call_next(request)

        if is_new:
            try:
                response = await call_next(request)

                # Delete key for server-side anomalies or client validation errors so the client can retry
                if response.status_code >= 400:
                    try:
                        client.delete(redis_key)
                    except Exception:
                        pass
                    return response

                # Consume and rebuild response body stream
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                # Save execution result
                serialized = serialize_response(
                    response.status_code, response.headers, response_body
                )
                try:
                    client.set(redis_key, serialized, ex=ttl)
                except Exception as redis_err:
                    logger.warning(
                        f"Failed to cache idempotency response in Redis: {redis_err}"
                    )

                # Return rebuilt response
                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )
            except Exception as e:
                try:
                    client.delete(redis_key)
                except Exception:
                    pass
                raise e
        else:
            # 6. Check state and poll if PENDING
            try:
                for _ in range(50):  # Poll up to 5 seconds (50 * 100ms)
                    val_bytes = client.get(redis_key)
                    if not val_bytes:
                        break

                    val_str = (
                        val_bytes
                        if isinstance(val_bytes, str)
                        else val_bytes.decode("utf-8")
                    )
                    val_data = json.loads(val_str)

                    if val_data.get("status") == "COMPLETED":
                        return deserialize_response(val_str)
                    elif val_data.get("status") == "PENDING":
                        await asyncio.sleep(0.1)
                    else:
                        break
            except Exception as redis_err:
                logger.warning(f"Failed polling Redis for idempotency key: {redis_err}")
                self.redis_client_mgr.mark_offline(str(redis_err))

            # Timeout or broken state -> Conflict
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "message": "A concurrent request is already processing this idempotency key.",
                    "error_code": "CONCURRENT_REQUEST",
                },
            )

# 📂 FILE: app/middleware/request_context.py
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.request_context import _request_context, request_id_ctx
from app.logging.logger import app_logger, access_logger
from app.config import settings
from app.monitoring.metrics import metrics


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that establishes the request context,
    tracks correlation IDs, and measures request-response duration.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()

        # 1. Resolve Correlation ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())

        # 2. Extract user ID from Authorization header safely (if present)
        user_id = "-"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                payload = jwt.decode(
                    bearer_token,
                    settings.SECRET_KEY.get_secret_value(),
                    algorithms=[settings.ALGORITHM]
                )
                user_id = payload.get("sub", "-")
            except Exception:
                pass

        # 3. Create context dictionary
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "Unknown"
        user_agent = request.headers.get("user-agent", "-")

        ctx_data = {
            "request_id": request_id,
            "method": method,
            "path": path,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "user_id": user_id,
            "start_time": start_time,
            "duration": 0.0
        }

        # 4. Bind context variables to contextvars
        token_ctx = _request_context.set(ctx_data)
        token_rid = request_id_ctx.set(request_id)

        try:
            response = await call_next(request)
            
            # Increment request counter metric
            try:
                from app.services.health_service import metrics_registry
                metrics_registry.increment_request_count()
            except Exception:
                pass

            return response
        finally:
            # 5. Measure duration
            duration = time.time() - start_time
            ctx_data["duration"] = duration

            # 6. Add X-Request-ID and X-Process-Time headers
            if 'response' in locals():
                response.headers["X-Request-ID"] = request_id
                response.headers["X-Process-Time"] = f"{duration:.6f}"
                status_code = response.status_code
            else:
                status_code = 500

            # 7. Record metrics report
            is_error = status_code >= 500
            metrics.record_request(duration, is_error=is_error)

            # 8. Write structured access log
            access_logger.info(
                f"HTTP Request Completed: method={method} path={path} status={status_code} "
                f"duration={duration:.4f}s ip={client_ip} user_id={user_id}"
            )

            # 9. Reset context variables
            _request_context.reset(token_ctx)
            request_id_ctx.reset(token_rid)

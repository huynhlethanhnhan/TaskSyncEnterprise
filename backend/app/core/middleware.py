# 📂 FILE: app/core/middleware.py
import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logger import app_logger, request_id_ctx
from app.config import settings


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that handles request latency measurement, correlation ID tracking,
    authenticated user-id extraction, and safe request metadata logging.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # 1. Generate or extract Request ID (Correlation ID)
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = uuid.uuid4().hex
            
        # 2. Store Request ID in contextvar for request-scoped access in logs/exceptions
        token_id = request_id_ctx.set(request_id)
        
        # 3. Extract authenticated User ID from Authorization JWT (if present)
        # Done safely without raising errors or interfering with authentication guards.
        user_id = "-"
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_token = auth_header.split(" ")[1]
            try:
                from jose import jwt
                # Decode using SecretStr secret value
                payload = jwt.decode(
                    bearer_token, 
                    settings.SECRET_KEY.get_secret_value(), 
                    algorithms=[settings.ALGORITHM]
                )
                user_id = payload.get("sub", "-")
            except Exception:
                pass

        method = request.method
        # We record the path to avoid logging sensitive query strings or passwords passed in URL parameters
        path = request.url.path
        client_ip = request.client.host if request.client else "Unknown"

        # 4. Proceed with request processing down the chain
        try:
            response = await call_next(request)
        finally:
            # Calculate execution duration
            process_time = time.time() - start_time
            
            # Clean up the context variable
            request_id_ctx.reset(token_id)

        # 5. Attach correlation ID to response headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time:.6f}"

        # 6. Structured application log
        # Excludes passwords, cookies, auth headers, and raw tokens
        app_logger.info(
            f"HTTP Request: method={method} path={path} status={response.status_code} "
            f"duration={process_time:.4f}s ip={client_ip} user_id={user_id}"
        )

        return response
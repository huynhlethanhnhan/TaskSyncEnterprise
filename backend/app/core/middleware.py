# 📂 FILE: app/core/middleware.py
"""
Centralized Middlewares Facade.
Maintains backward compatibility by mapping the LoggingMiddleware to the
new RequestContextMiddleware, and preserves SecurityHeadersMiddleware.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.middleware.request_context import RequestContextMiddleware
from app.config import settings

# Backward compatible mapping
LoggingMiddleware = RequestContextMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that sets standard security response headers (OWASP recommended)
    and disables caching of sensitive API query responses.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # 1. Standard OWASP security headers
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # 2. Disable cache for sensitive API responses
        if request.url.path.startswith(settings.API_V1_STR):
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response

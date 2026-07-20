import re
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings


class APIVersionMiddleware(BaseHTTPMiddleware):
    """
    Middleware that validates API version prefixes.
    Intercepts paths matching /api/vX/... and returns a structured 404 error
    if the parsed version is not configured in settings.SUPPORTED_API_VERSIONS.
    """

    def __init__(self, app):
        super().__init__(app)
        # Matches /api/v followed by digits, optionally followed by / or end of string
        self.version_pattern = re.compile(r"^/api/(v\d+)(?:/|$)")

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        match = self.version_pattern.match(path)
        if match:
            version = match.group(1)
            # Fetch from settings, defaulting to ["v1"]
            supported = getattr(settings, "SUPPORTED_API_VERSIONS", ["v1"])
            if version not in supported:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "message": "Unsupported API Version",
                        "supported_versions": list(supported),
                    },
                )
        return await call_next(request)

from typing import Callable, Any
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


def deprecate_endpoint(
    sunset: str | None = None, link: str | None = None
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """
    Decorator to attach sunset and successor version details to a path operation function.
    Usage:
        @router.get("/items", deprecated=True)
        @deprecate_endpoint(sunset="Tue, 01 Jan 2028 00:00:00 GMT", link="https://company.docs/api/v2")
        def read_items():
            ...
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        func.__deprecated_api__ = True
        func.__deprecated_sunset__ = sunset
        func.__deprecated_link__ = link
        return func

    return decorator


class APIDeprecationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that inspects route metadata to inject API governance headers
    (Deprecation, Sunset, Link) for deprecated endpoints.
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        route = request.scope.get("route")
        if route and hasattr(route, "endpoint"):
            endpoint = route.endpoint

            # Check native APIRoute deprecated attribute or custom decorator marker
            is_deprecated = getattr(route, "deprecated", False) or getattr(
                endpoint, "__deprecated_api__", False
            )

            if is_deprecated:
                response.headers["Deprecation"] = "true"

                sunset = getattr(endpoint, "__deprecated_sunset__", None)
                if sunset:
                    response.headers["Sunset"] = sunset

                link = getattr(endpoint, "__deprecated_link__", None)
                if link:
                    response.headers["Link"] = link

        return response

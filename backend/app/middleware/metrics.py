# 📂 FILE: app/middleware/metrics.py
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.monitoring.prometheus_metrics import prometheus_metrics
from app.config import settings


class PrometheusMetricsMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that collects HTTP request count, duration, 
    and responses status codes. Integrates with PrometheusMetrics.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        if not settings.ENABLE_METRICS:
            return await call_next(request)

        path = request.url.path
        method = request.method

        # Exclude specific paths from metrics collection
        excluded_paths = ["/metrics", "/docs", "/redoc", "/openapi.json"]
        if any(path.startswith(ex) for ex in excluded_paths) or path == "/":
            return await call_next(request)

        # Increment requests in progress
        prometheus_metrics.requests_in_progress.labels(method=method, path=path).inc()

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time
            status_code = str(response.status_code)

            # Record requests, responses, and duration metrics
            prometheus_metrics.http_requests_total.labels(
                method=method, path=path, status_code=status_code
            ).inc()
            prometheus_metrics.http_responses_total.labels(
                method=method, path=path, status_code=status_code
            ).inc()
            prometheus_metrics.http_request_duration.labels(
                method=method, path=path
            ).observe(duration)

            return response
        except Exception as e:
            duration = time.perf_counter() - start_time
            
            # Record failed request metrics
            prometheus_metrics.http_requests_total.labels(
                method=method, path=path, status_code="500"
            ).inc()
            prometheus_metrics.http_responses_total.labels(
                method=method, path=path, status_code="500"
            ).inc()
            prometheus_metrics.http_request_duration.labels(
                method=method, path=path
            ).observe(duration)
            raise e
        finally:
            prometheus_metrics.requests_in_progress.labels(method=method, path=path).dec()

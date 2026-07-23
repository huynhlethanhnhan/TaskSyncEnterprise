import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.request_context import (
    _request_context,
    request_id_ctx,
    correlation_id_ctx,
)
from app.logging.logger import app_logger, access_logger
from app.config import settings
from app.monitoring.metrics import metrics


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    HTTP Middleware that establishes the full request-scoped observability
    context for every incoming request.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_mono = time.perf_counter()
        start_time = time.time()
        request.state.start_mono = start_mono
        request.state.start_time = start_time

        # ── 1. Resolve Request ID ──────────────────────────────────────────
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # ── 2. Resolve Correlation ID ──────────────────────────────────────
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

        # ── 3. Extract user_id from Bearer token (best-effort, no error) ───
        user_id = "-"
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt

                bearer_token = auth_header.split(" ", 1)[1]
                payload = jwt.decode(
                    bearer_token,
                    settings.SECRET_KEY.get_secret_value(),
                    algorithms=[settings.ALGORITHM],
                )
                user_id = payload.get("sub", "-")
            except Exception:
                pass

        # ── 4. Build context dictionary ────────────────────────────────────
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "-")

        ctx_data: dict = {
            "request_id": request_id,
            "correlation_id": correlation_id,
            "method": method,
            "path": path,
            "client_ip": client_ip,
            "user_agent": user_agent,
            "user_id": user_id,
            "start_time": start_time,
            "start_mono": start_mono,
            "duration": 0.0,
            "duration_ms": 0.0,
        }

        # ── 5. Bind context variables ──────────────────────────────────────
        token_ctx = _request_context.set(ctx_data)
        token_rid = request_id_ctx.set(request_id)
        token_cid = correlation_id_ctx.set(correlation_id)

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
            # ── 6. Measure duration using monotonic perf_counter ─────────────
            duration = time.perf_counter() - start_mono
            duration_ms = duration * 1000.0
            ctx_data["duration"] = duration
            ctx_data["duration_ms"] = duration_ms

            # ── 7. Attach observability headers to response ────────────────
            if "response" in locals() and response is not None:
                response.headers.setdefault("X-Request-ID", request_id)
                response.headers.setdefault("X-Correlation-ID", correlation_id)
                response.headers["X-Process-Time"] = f"{duration:.6f}"
                status_code = response.status_code
            else:
                status_code = 500

            # ── 8. Prometheus request metric ───────────────────────────────
            is_error = status_code >= 500
            metrics.record_request(duration, is_error=is_error)

            # ── 9. Access log ───────────────────────────────────────────────
            error_code = ctx_data.get("error_code", "-")
            log_msg = (
                f"HTTP Request Completed: method={method} path={path} status={status_code} "
                f"duration={duration:.4f}s ip={client_ip} user_id={user_id} "
                f"duration_ms={duration_ms:.2f}ms user_agent={user_agent} "
                f"request_id={request_id} error_code={error_code}"
            )
            access_logger.info(
                log_msg,
                extra={
                    "duration_ms": duration_ms,
                    "status_code": status_code,
                    "error_code": error_code,
                    "user_agent": user_agent,
                    "correlation_id": correlation_id,
                },
            )

            # ── 10. Reset context variables ────────────────────────────────
            _request_context.reset(token_ctx)
            request_id_ctx.reset(token_rid)
            correlation_id_ctx.reset(token_cid)

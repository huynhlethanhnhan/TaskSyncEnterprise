# 📂 FILE: app/handlers/exception_handler.py
import logging
import time
from datetime import datetime, timezone
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError

from app.core.exceptions import (
    BaseAppException,
    AuthenticationException,
    AuthorizationException,
    ValidationException,
    BusinessRuleException,
    ResourceNotFoundException,
    DatabaseException,
    UnexpectedApplicationException,
)
from app.core import error_codes
from app.core.logger import error_logger, request_id_ctx
from app.schemas.response import ErrorResponse, ValidationErrorResponse


async def unified_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Centralized exception handler that processes all exceptions, maps them to standard
    enterprise exceptions, logs with dynamic levels, and returns standardized envelopes.
    """
    request_id = request_id_ctx.get()

    # ── Phase 3.7.7: Increment exception metrics ──
    try:
        from app.monitoring.prometheus_metrics import prometheus_metrics
        import asyncio

        path = request.url.path
        excluded_paths = ["/metrics", "/docs", "/redoc", "/openapi.json"]
        if not (any(path.startswith(ex) for ex in excluded_paths) or path == "/"):
            exc_name = exc.__class__.__name__

            # Increment total exceptions
            prometheus_metrics.app_exceptions_total.labels(
                exception_type=exc_name, path=path
            ).inc()

            # Check for timeout error
            is_timeout = False
            if isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
                is_timeout = True
            elif "timeout" in str(exc).lower():
                is_timeout = True

            if is_timeout:
                prometheus_metrics.timeout_errors_total.labels(
                    error_type=exc_name, path=path
                ).inc()
    except Exception:
        pass

    # 1. Map incoming exception to BaseAppException
    mapped_exc: BaseAppException

    if isinstance(exc, BaseAppException):
        mapped_exc = exc
    elif isinstance(exc, StarletteHTTPException):
        if exc.status_code == 401:
            mapped_exc = AuthenticationException(message=str(exc.detail), details=None)
        elif exc.status_code == 403:
            mapped_exc = AuthorizationException(message=str(exc.detail), details=None)
        elif exc.status_code == 404:
            mapped_exc = ResourceNotFoundException(
                message=str(exc.detail), details=None
            )
        else:
            mapped_exc = BaseAppException(
                message=str(exc.detail),
                error_code="HTTP_ERROR",
                status_code=exc.status_code,
                details=None,
                log_level=logging.WARNING,
            )
    elif isinstance(exc, (RequestValidationError, ValidationError)):
        details = exc.errors() if hasattr(exc, "errors") else str(exc)
        mapped_exc = ValidationException(
            message="Dữ liệu gửi lên không hợp lệ!",
            error_code=error_codes.VALIDATION_REQUEST_FAILED,
            details=details,
        )
    elif isinstance(exc, SQLAlchemyError):
        # Prevent leaking database schema details or connection strings to client
        mapped_exc = DatabaseException(
            message="Đã xảy ra lỗi tương tác cơ sở dữ liệu hệ thống.", details=None
        )
    elif isinstance(exc, PermissionError):
        mapped_exc = AuthorizationException(
            message="Quyền truy cập bị từ chối.", details=str(exc)
        )
    elif isinstance(exc, (ValueError, KeyError)):
        mapped_exc = BusinessRuleException(
            message=str(exc),
            error_code="VALUE_ERROR" if isinstance(exc, ValueError) else "KEY_ERROR",
            status_code=400,
            details=None,
        )
    else:
        # Unexpected, unhandled exceptions
        mapped_exc = UnexpectedApplicationException(
            message="Hệ thống gặp sự cố nội bộ.", details=str(exc)
        )

    # ── Increment specific validation and auth metrics ──
    try:
        from app.monitoring.prometheus_metrics import prometheus_metrics

        path = request.url.path
        excluded_paths = ["/metrics", "/docs", "/redoc", "/openapi.json"]
        if not (any(path.startswith(ex) for ex in excluded_paths) or path == "/"):
            if isinstance(mapped_exc, ValidationException):
                prometheus_metrics.validation_errors_total.labels(path=path).inc()
            elif isinstance(mapped_exc, AuthenticationException):
                prometheus_metrics.auth_errors_total.labels(
                    error_type="authentication", path=path
                ).inc()
            elif isinstance(mapped_exc, AuthorizationException):
                prometheus_metrics.auth_errors_total.labels(
                    error_type="authorization", path=path
                ).inc()
    except Exception:
        pass

    ctx_data = {}
    try:
        from app.core.request_context import get_request_context

        ctx_data = get_request_context()
        if ctx_data:
            ctx_data["error_code"] = mapped_exc.error_code
    except Exception:
        pass

    execution_time = None
    if hasattr(request.state, "start_mono"):
        execution_time = round(time.perf_counter() - request.state.start_mono, 4)
    elif ctx_data and "start_time" in ctx_data:
        execution_time = round(time.time() - ctx_data["start_time"], 4)

    log_metadata = {
        "request_id": request_id,
        "path": request.url.path,
        "method": request.method,
        "status_code": mapped_exc.status_code,
        "error_code": mapped_exc.error_code,
        "exception_type": exc.__class__.__name__,
        "execution_time": execution_time,
    }

    # 3. Log based on severity/level specified by the exception class
    log_msg = (
        f"Handled Exception [{log_metadata['exception_type']}]: {mapped_exc.message} | "
        f"Path: {log_metadata['path']} | Method: {log_metadata['method']} | "
        f"Status Code: {mapped_exc.status_code} | Error Code: {mapped_exc.error_code} | "
        f"Execution Time: {execution_time}s"
    )

    if mapped_exc.log_level >= logging.CRITICAL:
        error_logger.critical(log_msg, exc_info=True)
    elif mapped_exc.log_level >= logging.ERROR:
        error_logger.error(log_msg, exc_info=True)
    elif mapped_exc.log_level >= logging.WARNING:
        error_logger.warning(log_msg)
    else:
        error_logger.info(log_msg)

    # 4. Construct and return response body using P3.3-INF-001 schemas
    if isinstance(mapped_exc, ValidationException):
        response_model = ValidationErrorResponse(
            success=False,
            message=mapped_exc.message,
            error_code=mapped_exc.error_code,
            details=mapped_exc.details,
            trace_id=request_id,
        )
    else:
        response_model = ErrorResponse(
            success=False,
            message=mapped_exc.message,
            error_code=mapped_exc.error_code,
            details=mapped_exc.details,
            trace_id=request_id,
        )

    return JSONResponse(
        status_code=mapped_exc.status_code,
        headers={"X-Request-ID": request_id},
        content=response_model.model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers centralized global exception handlers for the FastAPI application.
    Converts diverse runtime errors into structured, client-safe JSON responses.
    """
    # Centralize registration to flow through unified_exception_handler
    app.add_exception_handler(BaseAppException, unified_exception_handler)
    app.add_exception_handler(StarletteHTTPException, unified_exception_handler)
    app.add_exception_handler(RequestValidationError, unified_exception_handler)
    app.add_exception_handler(ValidationError, unified_exception_handler)
    app.add_exception_handler(SQLAlchemyError, unified_exception_handler)
    app.add_exception_handler(PermissionError, unified_exception_handler)
    app.add_exception_handler(ValueError, unified_exception_handler)
    app.add_exception_handler(KeyError, unified_exception_handler)
    app.add_exception_handler(Exception, unified_exception_handler)

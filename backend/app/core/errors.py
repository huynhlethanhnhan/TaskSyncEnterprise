# 📂 FILE: app/core/errors.py
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import BusinessException
from app.core.logger import error_logger, request_id_ctx


def register_exception_handlers(app) -> None:
    """
    Registers global exception handlers for the FastAPI application.
    Ensures structured responses, error logging, and Correlation ID association.
    """

    @app.exception_handler(BusinessException)
    async def business_exception_handler(request: Request, exc: BusinessException) -> JSONResponse:
        request_id = request_id_ctx.get()
        # Log as warning since business rule failures are client actions
        error_logger.warning(f"BusinessException [{exc.__class__.__name__}]: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": exc.message,
                "request_id": request_id,
                "data": None
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = request_id_ctx.get()
        error_logger.warning(f"HTTPException [{exc.status_code}]: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": str(exc.detail),
                "request_id": request_id,
                "data": None
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = request_id_ctx.get()
        error_logger.warning(f"RequestValidationError: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": "Dữ liệu gửi lên không hợp lệ!",
                "request_id": request_id,
                "data": exc.errors()
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        request_id = request_id_ctx.get()
        # Log complete query/integrity trace details locally for troubleshooting
        error_logger.error(
            f"Database integrity or query execution failure: {exc}", 
            exc_info=True
        )
        # Avoid leaking internal DB columns/schemas to the client API response
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": "Đã xảy ra lỗi tương tác cơ sở dữ liệu hệ thống.",
                "request_id": request_id,
                "data": None
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = request_id_ctx.get()
        # Log unhandled exceptions with full tracebacks for root cause analyses
        error_logger.critical(
            f"Unhandled internal server error: {exc}", 
            exc_info=True
        )
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": "Hệ thống gặp sự cố nội bộ.",
                "request_id": request_id,
                "data": None
            },
        )
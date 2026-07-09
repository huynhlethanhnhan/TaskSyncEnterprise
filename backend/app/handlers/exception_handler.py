# 📂 FILE: app/handlers/exception_handler.py
import logging
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException
from app.core import error_codes
from app.core.logger import error_logger, request_id_ctx

def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers centralized global exception handlers for the FastAPI application.
    Converts diverse runtime errors into structured, client-safe JSON responses.
    """

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        request_id = request_id_ctx.get()
        
        # Log based on severity: warning for client-side issues (4xx), error for server issues (5xx)
        if exc.status_code >= 500:
            error_logger.error(
                f"AppException [{exc.__class__.__name__}]: {exc.message} | Error Code: {exc.error_code}",
                exc_info=True
            )
        else:
            error_logger.warning(
                f"AppException [{exc.__class__.__name__}]: {exc.message} | Error Code: {exc.error_code}"
            )
            
        return JSONResponse(
            status_code=exc.status_code,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": exc.message,
                "error_code": exc.error_code,
                "request_id": request_id,
                "data": exc.details
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = request_id_ctx.get()
        
        # Map HTTP status codes to standard error codes
        if exc.status_code == 401:
            error_code = error_codes.AUTH_UNAUTHORIZED
        elif exc.status_code == 403:
            error_code = error_codes.AUTH_FORBIDDEN
        elif exc.status_code == 404:
            error_code = error_codes.SYSTEM_INTERNAL_ERROR
        else:
            error_code = "HTTP_ERROR"
            
        error_logger.warning(f"HTTPException [{exc.status_code}]: {exc.detail} | Error Code: {error_code}")
        
        return JSONResponse(
            status_code=exc.status_code,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": str(exc.detail),
                "error_code": error_code,
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
                "error_code": error_codes.VALIDATION_REQUEST_FAILED,
                "request_id": request_id,
                "data": exc.errors()
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        request_id = request_id_ctx.get()
        
        # Log query trace detail locally for debugging
        error_logger.error(
            f"Database integrity or query execution failure: {exc}", 
            exc_info=True
        )
        
        # Do not leak database schema traces or column specifics to the client
        return JSONResponse(
            status_code=500,
            headers={"X-Request-ID": request_id},
            content={
                "success": False,
                "message": "Đã xảy ra lỗi tương tác cơ sở dữ liệu hệ thống.",
                "error_code": error_codes.DATABASE_INTEGRITY_VIOLATION,
                "request_id": request_id,
                "data": None
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = request_id_ctx.get()
        
        # Log unhandled exceptions with full tracebacks for diagnostics
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
                "error_code": error_codes.SYSTEM_INTERNAL_ERROR,
                "request_id": request_id,
                "data": None
            },
        )

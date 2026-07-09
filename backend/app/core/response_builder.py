# 📂 FILE: app/core/response_builder.py
import math
from typing import Any, list
from fastapi.responses import JSONResponse
from app.schemas.response import ApiResponse, PagedResponse, PaginationMeta
from app.core.logger import request_id_ctx


class ResponseBuilder:
    """Centralized enterprise builder class to construct standard successful API responses."""

    @staticmethod
    def _get_request_id() -> str | None:
        """Retrieves the request correlation ID from thread context."""
        try:
            req_id = request_id_ctx.get()
            return req_id if req_id != "-" else None
        except Exception:
            return None

    @classmethod
    def success(
        cls,
        data: Any = None,
        message: str = "Success",
        meta: Any = None
    ) -> ApiResponse[Any]:
        """Constructs an ApiResponse with status code 200."""
        return ApiResponse(
            success=True,
            message=message,
            data=data,
            request_id=cls._get_request_id(),
            meta=meta
        )

    @classmethod
    def created(
        cls,
        data: Any = None,
        message: str = "Resource created successfully",
        meta: Any = None
    ) -> ApiResponse[Any]:
        """Constructs an ApiResponse representing newly created resources."""
        return ApiResponse(
            success=True,
            message=message,
            data=data,
            request_id=cls._get_request_id(),
            meta=meta
        )

    @classmethod
    def updated(
        cls,
        data: Any = None,
        message: str = "Resource updated successfully",
        meta: Any = None
    ) -> ApiResponse[Any]:
        """Constructs an ApiResponse representing modified resources."""
        return ApiResponse(
            success=True,
            message=message,
            data=data,
            request_id=cls._get_request_id(),
            meta=meta
        )

    @classmethod
    def deleted(
        cls,
        message: str = "Resource deleted successfully",
        meta: Any = None
    ) -> ApiResponse[Any]:
        """Constructs an ApiResponse indicating a successful deletion operation."""
        return ApiResponse(
            success=True,
            message=message,
            data=None,
            request_id=cls._get_request_id(),
            meta=meta
        )

    @classmethod
    def no_content(cls) -> JSONResponse:
        """Constructs a raw HTTP 204 JSONResponse carrying correlation headers."""
        req_id = cls._get_request_id()
        headers = {}
        if req_id:
            headers["X-Request-ID"] = req_id
        return JSONResponse(status_code=204, headers=headers, content=None)

    @classmethod
    def pagination(
        cls,
        items: list[Any],
        page: int,
        size: int,
        total: int,
        message: str = "Success"
    ) -> PagedResponse[Any]:
        """Constructs a PagedResponse with computed metadata bounds."""
        pages = math.ceil(total / size) if size > 0 else 0
        return PagedResponse(
            success=True,
            message=message,
            data=items,
            request_id=cls._get_request_id(),
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages
            )
        )

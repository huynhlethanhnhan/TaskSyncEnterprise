# 📂 FILE: app/core/response_builder.py
import math
from typing import Any, List
from fastapi.responses import JSONResponse
from app.schemas.response import (
    SuccessResponse,
    CreatedResponse,
    UpdatedResponse,
    DeletedResponse,
    ResponseMeta,
    PagedResponse,
    PaginationMeta
)
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
    ) -> SuccessResponse[Any]:
        """Constructs a SuccessResponse with status code 200."""
        meta_obj = None
        if meta is not None:
            if isinstance(meta, dict):
                meta_obj = ResponseMeta(**meta)
            else:
                meta_obj = meta
        return SuccessResponse(
            success=True,
            message=message,
            data=data,
            meta=meta_obj or ResponseMeta()
        )

    @classmethod
    def created(
        cls,
        data: Any = None,
        message: str = "Resource created successfully",
        meta: Any = None
    ) -> CreatedResponse[Any]:
        """Constructs a CreatedResponse representing newly created resources."""
        meta_obj = None
        if meta is not None:
            if isinstance(meta, dict):
                meta_obj = ResponseMeta(**meta)
            else:
                meta_obj = meta
        return CreatedResponse(
            success=True,
            message=message,
            data=data,
            meta=meta_obj or ResponseMeta()
        )

    @classmethod
    def updated(
        cls,
        data: Any = None,
        message: str = "Resource updated successfully",
        meta: Any = None
    ) -> UpdatedResponse[Any]:
        """Constructs an UpdatedResponse representing modified resources."""
        meta_obj = None
        if meta is not None:
            if isinstance(meta, dict):
                meta_obj = ResponseMeta(**meta)
            else:
                meta_obj = meta
        return UpdatedResponse(
            success=True,
            message=message,
            data=data,
            meta=meta_obj or ResponseMeta()
        )

    @classmethod
    def deleted(
        cls,
        message: str = "Resource deleted successfully",
        meta: Any = None
    ) -> DeletedResponse:
        """Constructs a DeletedResponse indicating a successful deletion operation."""
        meta_obj = None
        if meta is not None:
            if isinstance(meta, dict):
                meta_obj = ResponseMeta(**meta)
            else:
                meta_obj = meta
        return DeletedResponse(
            success=True,
            message=message,
            data=None,
            meta=meta_obj or ResponseMeta()
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
        items: List[Any],
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
            meta=PaginationMeta(
                page=page,
                size=size,
                total=total,
                pages=pages
            )
        )

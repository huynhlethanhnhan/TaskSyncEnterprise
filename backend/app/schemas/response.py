# 📂 FILE: app/schemas/response.py
from datetime import datetime, timezone
import time
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field, model_validator

T = TypeVar("T")


def get_current_request_id() -> str | None:
    """Helper to retrieve correlation ID from active contextvars."""
    try:
        from app.core.request_context import get_request_id as get_req_id

        req_id = get_req_id()
        if req_id and req_id != "-":
            return req_id
    except Exception:
        pass
    try:
        from app.core.request_context import get_request_context

        ctx = get_request_context()
        return ctx.get("request_id") if ctx else None
    except Exception:
        return None


def get_current_execution_time() -> float | None:
    """Helper to calculate processing duration up to the current point."""
    try:
        from app.core.request_context import get_request_context

        ctx = get_request_context()
        if ctx and "start_time" in ctx:
            return time.time() - ctx["start_time"]
    except Exception:
        pass
    return None


class ResponseMeta(BaseModel):
    """Reusable metadata schema containing request context and timestamps."""

    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response construction timestamp (UTC ISO format)",
    )
    request_id: str | None = Field(
        default_factory=get_current_request_id,
        description="Correlation identifier for tracing requests",
    )
    execution_time: float | None = Field(
        default_factory=get_current_execution_time,
        description="Execution duration in seconds",
    )
    page: int | None = Field(
        default=None, description="Current page number (1-indexed)"
    )
    size: int | None = Field(default=None, description="Number of items per page")
    pages: int | None = Field(default=None, description="Total pages count")
    total: int | None = Field(
        default=None, description="Total count of database records matching query"
    )
    total_pages: int | None = Field(
        default=None, description="Total pages count (alias for compatibility)"
    )
    has_next: bool | None = Field(
        default=None, description="Indicates if there is a next page"
    )
    has_previous: bool | None = Field(
        default=None, description="Indicates if there is a previous page"
    )

    @model_validator(mode="before")
    @classmethod
    def calculate_pagination(cls, data: Any) -> Any:
        if isinstance(data, dict):
            page = data.get("page")
            size = data.get("size")
            total = data.get("total")
            if page is not None and size is not None and total is not None:
                import math

                pages = math.ceil(total / size) if size > 0 else 0
                data["pages"] = data.get("pages") or pages
                data["total_pages"] = data.get("total_pages") or pages
                data["has_next"] = (
                    data.get("has_next")
                    if data.get("has_next") is not None
                    else (page < pages)
                )
                data["has_previous"] = (
                    data.get("has_previous")
                    if data.get("has_previous") is not None
                    else (page > 1)
                )
        return data


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success API envelope structure."""

    success: bool = Field(default=True, description="Indicates call success status")
    message: str = Field(
        default="Success", description="User facing response message description"
    )
    data: T | None = Field(default=None, description="Response payload data block")
    meta: ResponseMeta = Field(
        default_factory=ResponseMeta, description="Response metadata"
    )
    request_id: str | None = Field(
        default=None,
        description="Correlation identifier for tracing requests (Root-level for compatibility)",
    )
    timestamp: str | None = Field(
        default=None,
        description="Response construction timestamp (Root-level for compatibility)",
    )

    @model_validator(mode="before")
    @classmethod
    def sync_meta_and_root(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Resolve request_id
            req_id = data.get("request_id")
            meta = data.get("meta")
            if isinstance(meta, dict):
                meta_req_id = meta.get("request_id")
            elif hasattr(meta, "request_id"):
                meta_req_id = meta.request_id
            else:
                meta_req_id = None

            resolved_req_id = req_id or meta_req_id or get_current_request_id()
            data["request_id"] = resolved_req_id

            # Resolve timestamp
            ts = data.get("timestamp")
            if isinstance(meta, dict):
                meta_ts = meta.get("timestamp")
            elif hasattr(meta, "timestamp"):
                meta_ts = meta.timestamp
            else:
                meta_ts = None

            resolved_ts = ts or meta_ts or datetime.now(timezone.utc).isoformat()
            data["timestamp"] = resolved_ts

            # Build or update meta
            if meta is None:
                data["meta"] = {
                    "timestamp": resolved_ts,
                    "request_id": resolved_req_id,
                    "execution_time": get_current_execution_time(),
                }
            elif isinstance(meta, dict):
                meta["timestamp"] = meta.get("timestamp") or resolved_ts
                meta["request_id"] = meta.get("request_id") or resolved_req_id
                meta["execution_time"] = (
                    meta.get("execution_time") or get_current_execution_time()
                )
            elif isinstance(meta, ResponseMeta):
                data["request_id"] = meta.request_id or resolved_req_id
                data["timestamp"] = meta.timestamp or resolved_ts
        return data


class CreatedResponse(SuccessResponse[T]):
    """Standard success API envelope for newly created resources (201)."""

    message: str = Field(
        default="Resource created successfully",
        description="User facing response message description",
    )


class UpdatedResponse(SuccessResponse[T]):
    """Standard success API envelope for updated resources (200)."""

    message: str = Field(
        default="Resource updated successfully",
        description="User facing response message description",
    )


class DeletedResponse(SuccessResponse[None]):
    """Standard success API envelope for deleted resources (200)."""

    message: str = Field(
        default="Resource deleted successfully",
        description="User facing response message description",
    )
    data: None = Field(default=None, description="Response payload data block")


class ListResponse(SuccessResponse[list[T]], Generic[T]):
    """Standard response model for a plain list of items."""

    pass


class DetailResponse(SuccessResponse[T], Generic[T]):
    """Standard response model for a single detailed item."""

    pass


class PaginationModel(BaseModel, Generic[T]):
    """Standard Pagination model for wrapped list items."""

    page: int = Field(..., description="Current page number (1-indexed)")
    size: int = Field(..., description="Number of items per page")
    total: int = Field(
        ..., description="Total count of database records matching query"
    )
    pages: int = Field(
        ..., description="Total pages count calculated from total and size"
    )
    items: list[T] = Field(
        default_factory=list, description="Array containing items payload collection"
    )


class PaginatedResponse(SuccessResponse[PaginationModel[T]], Generic[T]):
    """Standard paginated response wrapper where data is PaginationModel."""

    pass


class ErrorResponse(BaseModel):
    """Standard error API envelope structure matching global exception responses."""

    success: bool = Field(default=False, description="Indicates failure status")
    message: str = Field(..., description="Detailed failure message details")
    error_code: str = Field(
        ..., description="Module specific custom error identifier code"
    )
    details: Any = Field(
        default=None, description="Detailed validation error payload blocks"
    )
    trace_id: str | None = Field(
        default_factory=get_current_request_id,
        description="Correlation identifier for tracing requests",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response construction timestamp (UTC ISO format)",
    )
    # Backward compatibility fields
    request_id: str | None = Field(
        default=None,
        description="Correlation identifier for tracing requests (Compatibility)",
    )
    data: Any = Field(
        default=None,
        description="Detailed validation error payload blocks (Compatibility)",
    )

    @model_validator(mode="before")
    @classmethod
    def sync_error_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Sync trace_id and request_id
            t_id = (
                data.get("trace_id")
                or data.get("request_id")
                or get_current_request_id()
            )
            data["trace_id"] = t_id
            data["request_id"] = t_id

            # Sync details and data
            dt = (
                data.get("details")
                if data.get("details") is not None
                else data.get("data")
            )
            data["details"] = dt
            data["data"] = dt
        return data


class ValidationErrorResponse(ErrorResponse):
    """Specifically for 422 Request Validation Errors."""

    message: str = Field(
        default="Dữ liệu gửi lên không hợp lệ!",
        description="Detailed failure message details",
    )
    error_code: str = Field(
        default="VALIDATION_REQUEST_FAILED",
        description="Module specific custom error identifier code",
    )


# --- Backward Compatibility Mappings ---
ApiResponse = SuccessResponse
PaginationMeta = ResponseMeta


class MetaData(BaseModel):
    """Standard empty model for extra API response metadata."""

    pass


class PagedResponse(SuccessResponse[list[T]], Generic[T]):
    """Standard paginated collection API envelope structure (Compatibility mapping)."""

    data: list[T] = Field(
        default_factory=list, description="Array containing items payload collection"
    )

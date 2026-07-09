# 📂 FILE: app/schemas/response.py
from datetime import datetime, timezone
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class MetaData(BaseModel):
    """Standard empty model for extra API response metadata."""
    pass


class PaginationMeta(BaseModel):
    """Metadata detailing item pagination ranges and totals."""
    page: int = Field(..., description="Current page number (1-indexed)")
    size: int = Field(..., description="Number of items per page")
    total: int = Field(..., description="Total count of database records matching query")
    pages: int = Field(..., description="Total pages count calculated from total and size")


class ApiResponse(BaseModel, Generic[T]):
    """Standard success API envelope structure."""
    success: bool = Field(default=True, description="Indicates call success status")
    message: str = Field(default="Success", description="User facing response message description")
    data: T | None = Field(default=None, description="Response payload data block")
    request_id: str | None = Field(default=None, description="Correlation identifier for tracing requests")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response construction timestamp (UTC ISO format)"
    )
    meta: Any = Field(default=None, description="Additional custom metadata fields")


class PagedResponse(BaseModel, Generic[T]):
    """Standard paginated collection API envelope structure."""
    success: bool = Field(default=True, description="Indicates call success status")
    message: str = Field(default="Success", description="User facing response message description")
    data: list[T] = Field(default_factory=list, description="Array containing items payload collection")
    request_id: str | None = Field(default=None, description="Correlation identifier for tracing requests")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Response construction timestamp (UTC ISO format)"
    )
    meta: PaginationMeta = Field(..., description="Pagination metadata ranges")


class ErrorResponse(BaseModel):
    """Standard error API envelope structure matching global exception responses."""
    success: bool = Field(default=False, description="Indicates failure status")
    message: str = Field(..., description="Detailed failure message details")
    error_code: str = Field(..., description="Module specific custom error identifier code")
    request_id: str | None = Field(default=None, description="Correlation identifier for tracing requests")
    data: Any = Field(default=None, description="Detailed validation error payload blocks")
# 📂 FILE: app/schemas/pagination.py
from datetime import datetime
from typing import Literal, List, Any
from pydantic import BaseModel, Field


class PaginationParams(BaseModel):
    """Standard pagination parameters."""

    page: int = Field(default=1, ge=1, description="Current page number (1-indexed)")
    size: int = Field(default=20, ge=1, le=100, description="Number of items per page")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


class BaseFilterParams(BaseModel):
    """Standard filter parameters that can be extended by entity-specific schemas."""

    keyword: str | None = Field(default=None, description="General search keyword")
    status: str | None = Field(default=None, description="Status filter")
    created_from: datetime | None = Field(
        default=None, description="Created from timestamp"
    )
    created_to: datetime | None = Field(
        default=None, description="Created to timestamp"
    )
    updated_from: datetime | None = Field(
        default=None, description="Updated from timestamp"
    )
    updated_to: datetime | None = Field(
        default=None, description="Updated to timestamp"
    )
    is_active: bool | None = Field(default=None, description="Active status filter")


class SortParams(BaseModel):
    """Standard sorting parameters."""

    sort_by: str | None = Field(default=None, description="Field name to sort by")
    sort_order: Literal["asc", "desc"] = Field(
        default="asc", description="Sorting direction"
    )

    def validate_sort_by(self, allowed_fields: List[str]) -> str | None:
        """Validates if sort_by field is allowed, returning None or raising ValueError."""
        if self.sort_by and self.sort_by not in allowed_fields:
            raise ValueError(
                f"Sorting by '{self.sort_by}' is not allowed. Allowed fields: {allowed_fields}"
            )
        return self.sort_by

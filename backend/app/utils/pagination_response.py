# 📂 FILE: app/utils/pagination_response.py
from typing import Any, list
from app.core.response_builder import ResponseBuilder
from app.schemas.response import PagedResponse


def build_pagination_response(
    items: list[Any],
    page: int,
    size: int,
    total: int,
    message: str = "Success"
) -> PagedResponse[Any]:
    """
    Utility helper that constructs a standardized PagedResponse.
    Delegates response creation details to ResponseBuilder.pagination.
    """
    return ResponseBuilder.pagination(
        items=items,
        page=page,
        size=size,
        total=total,
        message=message
    )

# 📂 FILE: app/utils/query_engine.py
import math
from typing import Any, Type, TypeVar, List, Tuple
from sqlalchemy.orm import Query
from app.schemas.pagination import PaginationParams, SortParams, BaseFilterParams

ModelT = TypeVar("ModelT")


class QueryEngine:
    """Reusable engine to apply filtering, sorting, and pagination to SQLAlchemy queries."""

    @staticmethod
    def apply_filters(
        query: Query,
        model: Type[ModelT],
        filters: BaseFilterParams,
        search_fields: List[str] | None = None,
    ) -> Query:
        """Applies common filters and search keywords to the query."""
        # 1. Keyword search (delegated to SearchEngine)
        if filters.keyword and search_fields:
            from app.utils.search_engine import SearchEngine

            query = SearchEngine.search(query, model, filters.keyword, search_fields)

        # 2. Status filter
        if filters.status is not None and hasattr(model, "status"):
            query = query.filter(getattr(model, "status") == filters.status)

        # 3. Active status filter
        if filters.is_active is not None and hasattr(model, "is_active"):
            query = query.filter(getattr(model, "is_active") == filters.is_active)

        # 4. Created from/to timestamps
        if filters.created_from is not None and hasattr(model, "created_at"):
            query = query.filter(getattr(model, "created_at") >= filters.created_from)
        if filters.created_to is not None and hasattr(model, "created_at"):
            query = query.filter(getattr(model, "created_at") <= filters.created_to)

        # 5. Updated from/to timestamps
        if filters.updated_from is not None and hasattr(model, "updated_at"):
            query = query.filter(getattr(model, "updated_at") >= filters.updated_from)
        if filters.updated_to is not None and hasattr(model, "updated_at"):
            query = query.filter(getattr(model, "updated_at") <= filters.updated_to)

        return query

    @staticmethod
    def apply_sorting(
        query: Query,
        model: Type[ModelT],
        sort_params: SortParams,
        allowed_fields: List[str],
        default_sort_by: str = "id",
        default_sort_order: str = "asc",
    ) -> Query:
        """Applies validated sorting to the query."""
        sort_by = sort_params.sort_by or default_sort_by
        sort_order = sort_params.sort_order or default_sort_order

        # Fallback to default if field is not allowed
        if sort_by not in allowed_fields:
            sort_by = default_sort_by

        if hasattr(model, sort_by):
            field_attr = getattr(model, sort_by)
            if sort_order == "desc":
                query = query.order_by(field_attr.desc())
            else:
                query = query.order_by(field_attr.asc())
        return query

    @classmethod
    def paginate_query(
        cls, query: Query, model: Type[ModelT], pagination_params: PaginationParams
    ) -> Tuple[List[ModelT], int]:
        """
        Paginates the query using a count check followed by limit/offset.
        """
        total = query.count()
        items = (
            query.offset(pagination_params.offset).limit(pagination_params.size).all()
        )
        return items, total

    @classmethod
    def apply_pipeline(
        cls,
        query: Query,
        model: Type[ModelT],
        filters: BaseFilterParams,
        sort_params: SortParams,
        pagination_params: PaginationParams,
        search_fields: List[str] | None = None,
        allowed_sort_fields: List[str] | None = None,
        default_sort_by: str = "id",
        default_sort_order: str = "asc",
    ) -> Tuple[List[ModelT], int]:
        """
        Runs the full standardized query pipeline:
        Query -> Search -> Filter -> Sort -> Pagination
        """
        from app.utils.search_engine import SearchEngine

        # 1. Search
        if search_fields:
            query = SearchEngine.search(query, model, filters.keyword, search_fields)

        # 2. Filter
        query = cls.apply_filters(query, model, filters)

        # 3. Sort
        if allowed_sort_fields:
            query = cls.apply_sorting(
                query,
                model,
                sort_params,
                allowed_sort_fields,
                default_sort_by,
                default_sort_order,
            )

        # 4. Pagination
        return cls.paginate_query(query, model, pagination_params)

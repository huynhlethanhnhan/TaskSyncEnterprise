# 📂 FILE: app/utils/search_engine.py
from typing import Any, Type, TypeVar, List
from sqlalchemy.orm import Query
from sqlalchemy import or_

ModelT = TypeVar("ModelT")


class SearchEngine:
    """Reusable search engine utility for keyword search across multiple model fields."""

    @staticmethod
    def search(
        query: Query, model: Type[ModelT], keyword: str | None, search_fields: List[str]
    ) -> Query:
        """
        Applies a case-insensitive, partial-matching search query on the specified model fields.
        Protects against SQL Injection by utilizing SQLAlchemy's safe expression APIs.
        """
        if not keyword or not search_fields:
            return query

        search_filters = []
        for field_name in search_fields:
            if hasattr(model, field_name):
                field_attr = getattr(model, field_name)
                if hasattr(field_attr, "ilike"):
                    search_filters.append(field_attr.ilike(f"%{keyword}%"))

        if search_filters:
            query = query.filter(or_(*search_filters))

        return query

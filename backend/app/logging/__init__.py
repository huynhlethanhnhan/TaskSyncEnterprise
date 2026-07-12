# 📂 FILE: app/logging/__init__.py
"""
Public API for the TaskSyncEnterprise structured logging module.

Import from here to avoid internal path coupling:

    from app.logging import app_logger, setup_logging
    from app.logging import set_correlation_id, set_user_id
"""
from app.logging.logger import (
    setup_logging,
    app_logger,
    error_logger,
    audit_logger,
    access_logger,
    security_logger,
    db_logger,
)
from app.logging.context import (
    get_log_context,
    get_correlation_id,
    get_trace_id,
    get_span_id,
    get_tenant_id,
    get_project_id,
    set_correlation_id,
    set_trace_id,
    set_span_id,
    set_user_id,
    set_tenant_id,
    set_project_id,
)
from app.logging.filters import mask_sensitive, SensitiveDataFilter
from app.logging.middleware import StructuredLoggingMiddleware

__all__ = [
    # Setup
    "setup_logging",
    # Loggers
    "app_logger",
    "error_logger",
    "audit_logger",
    "access_logger",
    "security_logger",
    "db_logger",
    # Context getters
    "get_log_context",
    "get_correlation_id",
    "get_trace_id",
    "get_span_id",
    "get_tenant_id",
    "get_project_id",
    # Context setters
    "set_correlation_id",
    "set_trace_id",
    "set_span_id",
    "set_user_id",
    "set_tenant_id",
    "set_project_id",
    # Filters
    "mask_sensitive",
    "SensitiveDataFilter",
    # Middleware
    "StructuredLoggingMiddleware",
]

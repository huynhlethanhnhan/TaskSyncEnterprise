# 📂 FILE: app/core/logger.py
"""
Centralized Logger Facade.
Re-exports the setup_logging function and standard loggers from the
new app.logging.logger module to ensure 100% backward compatibility.
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
from app.core.request_context import request_id_ctx

# Expose everything to make sure existing imports continue working seamlessly
__all__ = [
    "setup_logging",
    "app_logger",
    "error_logger",
    "audit_logger",
    "access_logger",
    "security_logger",
    "db_logger",
    "request_id_ctx",
]

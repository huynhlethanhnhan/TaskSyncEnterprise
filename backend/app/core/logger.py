# 📂 FILE: app/core/logger.py
import logging
from logging.handlers import RotatingFileHandler
import contextvars
from pathlib import Path

from app.config import settings

# Context variable to hold the unique correlation ID for the current request context
request_id_ctx = contextvars.ContextVar("request_id", default="-")

# Reusable logger instances
app_logger = logging.getLogger("app")
error_logger = logging.getLogger("error")
audit_logger = logging.getLogger("audit")


class CorrelationIdFilter(logging.Filter):
    """
    Filter that dynamically injects the request-scoped correlation ID
    into each logging record.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def setup_logging() -> None:
    """
    Initializes the centralized enterprise logging system.
    Configures handlers, rotation policies, and formatting based on settings.
    """
    # 1. Create log folder if filesystem logging is enabled
    if settings.ENABLE_FILE_LOGGING:
        log_dir = settings.LOG_DIR_PATH
        log_dir.mkdir(parents=True, exist_ok=True)

    # 2. Build core Formatter and Filter
    formatter = logging.Formatter(settings.LOG_FORMAT)
    correlation_filter = CorrelationIdFilter()

    # 3. Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(settings.LOG_LEVEL)

    # 4. Console Handler
    console_handler = None
    if settings.ENABLE_CONSOLE_LOGGING:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(settings.LOG_LEVEL)
        console_handler.setFormatter(formatter)
        console_handler.addFilter(correlation_filter)
        root_logger.addHandler(console_handler)

    # 5. File Handlers
    if settings.ENABLE_FILE_LOGGING:
        # app.log: Captures all application activities matching settings.LOG_LEVEL and above
        app_log_path = settings.LOG_DIR_PATH / "app.log"
        app_handler = RotatingFileHandler(
            app_log_path,
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        app_handler.setLevel(settings.LOG_LEVEL)
        app_handler.setFormatter(formatter)
        app_handler.addFilter(correlation_filter)
        root_logger.addHandler(app_handler)

        # error.log: Captures warnings, errors, and system faults (WARNING level and above)
        error_log_path = settings.LOG_DIR_PATH / "error.log"
        error_handler = RotatingFileHandler(
            error_log_path,
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        error_handler.setLevel(logging.WARNING)
        error_handler.setFormatter(formatter)
        error_handler.addFilter(correlation_filter)
        root_logger.addHandler(error_handler)

        # audit.log: Dedicated compliance & audit event log file
        audit_log_path = settings.LOG_DIR_PATH / "audit.log"
        audit_handler = RotatingFileHandler(
            audit_log_path,
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        audit_handler.setLevel(logging.INFO)
        audit_handler.setFormatter(formatter)
        audit_handler.addFilter(correlation_filter)
        
        # Configure isolated audit logger
        audit_logger.setLevel(logging.INFO)
        audit_logger.handlers.clear()
        audit_logger.addHandler(audit_handler)
        
        # In console logging mode, print audit logs to console for local developer tracking
        if console_handler:
            audit_logger.addHandler(console_handler)
            
        # Isolate audit logging to avoid polluting standard app.log
        audit_logger.propagate = False

    # 6. Align internal FastAPI/Uvicorn log streams with the centralized root logger handlers
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
        l = logging.getLogger(name)
        l.handlers.clear()
        l.propagate = True

    # 7. Configure logger levels
    app_logger.setLevel(settings.LOG_LEVEL)
    error_logger.setLevel(settings.LOG_LEVEL)
    
    app_logger.info("Enterprise logging system successfully initialized.")

# 📂 FILE: app/logging/logger.py
import logging
from logging.handlers import RotatingFileHandler
from app.config import settings
from app.logging.formatter import StructuredFormatter

# Centralized Logger Instances
app_logger = logging.getLogger("app")
error_logger = logging.getLogger("error")
audit_logger = logging.getLogger("audit")
access_logger = logging.getLogger("access")
security_logger = logging.getLogger("security")
db_logger = logging.getLogger("database")


def setup_logging() -> None:
    """
    Initializes the centralized enterprise logging system.
    Sets up StructuredFormatter across all registered application loggers.
    """
    # 1. Create log folder if file logging is enabled
    if settings.ENABLE_FILE_LOGGING:
        log_dir = settings.LOG_DIR_PATH
        log_dir.mkdir(parents=True, exist_ok=True)

    # 2. Build structured formatting
    formatter = StructuredFormatter(settings.LOG_FORMAT, use_json=False)

    # 3. Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(settings.LOG_LEVEL)

    # 4. Console Handler
    if settings.ENABLE_CONSOLE_LOGGING:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(settings.LOG_LEVEL)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    # 5. File Handlers (if enabled)
    if settings.ENABLE_FILE_LOGGING:
        # app.log: Captures general application activities
        app_handler = RotatingFileHandler(
            settings.LOG_DIR_PATH / "app.log",
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        app_handler.setLevel(settings.LOG_LEVEL)
        app_handler.setFormatter(formatter)
        root_logger.addHandler(app_handler)

        # error.log: Captures warnings, errors, and system faults
        error_handler = RotatingFileHandler(
            settings.LOG_DIR_PATH / "error.log",
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        error_handler.setLevel(logging.WARNING)
        error_handler.setFormatter(formatter)
        root_logger.addHandler(error_handler)

        # access.log: Captures API access logs separately
        access_handler = RotatingFileHandler(
            settings.LOG_DIR_PATH / "access.log",
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        access_handler.setLevel(settings.LOG_LEVEL)
        access_handler.setFormatter(formatter)
        
        access_logger.setLevel(settings.LOG_LEVEL)
        access_logger.handlers.clear()
        access_logger.addHandler(access_handler)
        if settings.ENABLE_CONSOLE_LOGGING:
            access_console = logging.StreamHandler()
            access_console.setLevel(settings.LOG_LEVEL)
            access_console.setFormatter(formatter)
            access_logger.addHandler(access_console)
        access_logger.propagate = False

        # audit.log: Dedicated compliance & audit event log file
        audit_handler = RotatingFileHandler(
            settings.LOG_DIR_PATH / "audit.log",
            maxBytes=settings.LOG_ROTATION_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        audit_handler.setLevel(logging.INFO)
        audit_handler.setFormatter(formatter)
        
        # Configure isolated audit logger
        audit_logger.setLevel(logging.INFO)
        audit_logger.handlers.clear()
        audit_logger.addHandler(audit_handler)
        if settings.ENABLE_CONSOLE_LOGGING:
            audit_console = logging.StreamHandler()
            audit_console.setLevel(logging.INFO)
            audit_console.setFormatter(formatter)
            audit_logger.addHandler(audit_console)
        audit_logger.propagate = False

    # 6. Align internal FastAPI/Uvicorn log streams with the centralized root logger
    for name in ("uvicorn", "uvicorn.error", "fastapi"):
        l = logging.getLogger(name)
        l.handlers.clear()
        l.propagate = True

    # Disable uvicorn access logs since we have enterprise access_logger
    uv_access = logging.getLogger("uvicorn.access")
    uv_access.handlers.clear()
    uv_access.propagate = False

    # 7. Configure logger levels
    app_logger.setLevel(settings.LOG_LEVEL)
    error_logger.setLevel(settings.LOG_LEVEL)
    access_logger.setLevel(settings.LOG_LEVEL)
    security_logger.setLevel(settings.LOG_LEVEL)
    db_logger.setLevel(settings.LOG_LEVEL)
    
    app_logger.info("Enterprise logging system successfully initialized (P3.2-004).")

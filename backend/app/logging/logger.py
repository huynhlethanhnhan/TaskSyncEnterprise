# 📂 FILE: app/logging/logger.py
"""
Centralized Enterprise Logging System for TaskSyncEnterprise.

Initialises and exposes the canonical logger instances used throughout the
application.  Delegates handler / formatter construction to the config module
so that this file remains a pure "wiring" layer.

Logger hierarchy
  root                   → catches everything not caught by named loggers
  ├── app                → general application events
  ├── error              → warnings, errors, criticals
  ├── access             → HTTP access log (isolated: propagate=False)
  ├── audit              → compliance & audit trail (isolated: propagate=False)
  ├── security           → security events (auth failures, brute-force, …)
  └── database           → SQLAlchemy / database activity
"""
import logging
from app.config import settings
from app.logging.config import (
    build_console_handler,
    build_rotating_file_handler,
    configure_third_party_loggers,
)

# ──────────────────────────────────────────────────────────────────────────────
# Canonical logger instances – import these everywhere in the application
# ──────────────────────────────────────────────────────────────────────────────
app_logger = logging.getLogger("app")
error_logger = logging.getLogger("error")
audit_logger = logging.getLogger("audit")
access_logger = logging.getLogger("access")
security_logger = logging.getLogger("security")
db_logger = logging.getLogger("database")


# ──────────────────────────────────────────────────────────────────────────────
# Setup function
# ──────────────────────────────────────────────────────────────────────────────

def setup_logging() -> None:
    """
    Initialises the centralized enterprise structured logging system.

    Behaviour:
      - Development  → pretty console + JSON file handlers
      - Production   → JSON-only console + JSON file handlers
      - Testing      → minimal console output (JSON)

    Can be called multiple times safely; handlers are cleared before re-adding.
    """
    level = settings.LOG_LEVEL
    is_production = settings.ENVIRONMENT == "production"
    use_json_console = is_production or settings.ENVIRONMENT == "testing"
    fmt = settings.LOG_FORMAT  # used only for pretty-print formatter

    # ── 1. Root logger ─────────────────────────────────────────────────────
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)

    if settings.ENABLE_CONSOLE_LOGGING:
        root.addHandler(
            build_console_handler(level=level, use_json=use_json_console, fmt=fmt)
        )

    if settings.ENABLE_FILE_LOGGING:
        log_dir = settings.LOG_DIR_PATH
        log_dir.mkdir(parents=True, exist_ok=True)

        # app.log – general application activity
        root.addHandler(
            build_rotating_file_handler(
                file_path=log_dir / "application.log",
                level=level,
                max_bytes=settings.LOG_ROTATION_SIZE,
                backup_count=settings.LOG_BACKUP_COUNT,
            )
        )
        # Backward compat alias
        root.addHandler(
            build_rotating_file_handler(
                file_path=log_dir / "app.log",
                level=level,
                max_bytes=settings.LOG_ROTATION_SIZE,
                backup_count=settings.LOG_BACKUP_COUNT,
            )
        )

        # error.log – warnings and above
        root.addHandler(
            build_rotating_file_handler(
                file_path=log_dir / "error.log",
                level="WARNING",
                max_bytes=settings.LOG_ROTATION_SIZE,
                backup_count=settings.LOG_BACKUP_COUNT,
            )
        )

    # ── 2. Isolated access logger ───────────────────────────────────────────
    _configure_isolated_logger(
        logger=access_logger,
        level=level,
        log_file=settings.LOG_DIR_PATH / "access.log" if settings.ENABLE_FILE_LOGGING else None,
        max_bytes=settings.LOG_ROTATION_SIZE,
        backup_count=settings.LOG_BACKUP_COUNT,
        console=settings.ENABLE_CONSOLE_LOGGING,
        use_json_console=use_json_console,
        fmt=fmt,
    )

    # ── 3. Isolated audit logger ────────────────────────────────────────────
    _configure_isolated_logger(
        logger=audit_logger,
        level="INFO",
        log_file=settings.LOG_DIR_PATH / "audit.log" if settings.ENABLE_FILE_LOGGING else None,
        max_bytes=settings.LOG_ROTATION_SIZE,
        backup_count=settings.LOG_BACKUP_COUNT,
        console=settings.ENABLE_CONSOLE_LOGGING,
        use_json_console=use_json_console,
        fmt=fmt,
    )

    # ── 4. Named logger levels ──────────────────────────────────────────────
    for lgr in (app_logger, error_logger, security_logger, db_logger):
        lgr.setLevel(level)
    error_logger.setLevel("WARNING")

    # ── 5. Silence / redirect noisy third-party loggers ─────────────────────
    configure_third_party_loggers(level)

    app_logger.info(
        "Enterprise structured logging system initialised (Phase 3.7.3).",
        extra={"event": "logging_initialized", "environment": settings.ENVIRONMENT},
    )


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

def _configure_isolated_logger(
    logger: logging.Logger,
    level: str,
    log_file,
    max_bytes: int,
    backup_count: int,
    console: bool,
    use_json_console: bool,
    fmt: str | None,
) -> None:
    """
    Configures a logger in isolated mode (propagate=False) with dedicated
    handlers so its records do NOT bleed into the root logger.
    """
    logger.handlers.clear()
    logger.setLevel(level)
    logger.propagate = False

    if console:
        logger.addHandler(
            build_console_handler(level=level, use_json=use_json_console, fmt=fmt)
        )

    if log_file is not None:
        logger.addHandler(
            build_rotating_file_handler(
                file_path=log_file,
                level=level,
                max_bytes=max_bytes,
                backup_count=backup_count,
            )
        )

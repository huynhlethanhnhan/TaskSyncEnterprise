# 📂 FILE: app/core/validation.py
import logging
import sys
import threading
from pathlib import Path
import uuid
from sqlalchemy import text

from app.config import settings

logger = logging.getLogger("uvicorn")

# Thread-safety: ensures validations are executed exactly once across imports/threads
_validation_lock = threading.Lock()
_validation_run = False


def check_directory_writable(path: Path) -> bool:
    """
    Safely checks if a directory is writable by resolving race conditions,
    handling permission failures, and ensuring proper cleanup of test files.
    """
    try:
        # Atomic recursive creation prevents race conditions
        path.mkdir(parents=True, exist_ok=True)
        
        # Test write permission with unique temporary file
        temp_file = path / f".write_test_{uuid.uuid4().hex}"
        try:
            temp_file.write_text("write_test", encoding="utf-8")
            if not temp_file.exists():
                return False
            temp_file.unlink()
            return True
        except (IOError, OSError) as e:
            logger.error(f"Failed to perform write operation inside directory '{path}': {e}")
            return False
        finally:
            # Reentrant cleanup to handle unexpected unlink errors
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass
    except (IOError, OSError) as e:
        logger.error(f"Failed to create directory structure at '{path}': {e}")
        return False


def validate_pagination_settings() -> None:
    """Validates configuration parameters for pagination limits."""
    if settings.DEFAULT_PAGE_SIZE <= 0:
        raise ValueError(
            f"Invalid configuration: DEFAULT_PAGE_SIZE must be greater than 0. Got: {settings.DEFAULT_PAGE_SIZE}"
        )
    if settings.MAX_PAGE_SIZE < settings.DEFAULT_PAGE_SIZE:
        raise ValueError(
            f"Invalid configuration: MAX_PAGE_SIZE ({settings.MAX_PAGE_SIZE}) "
            f"cannot be smaller than DEFAULT_PAGE_SIZE ({settings.DEFAULT_PAGE_SIZE})."
        )


def validate_security_settings() -> None:
    """Validates production credentials safety."""
    if settings.ENVIRONMENT == "production":
        secret_key_val = settings.SECRET_KEY.get_secret_value()
        if secret_key_val == "task_sync_enterprise_secret_key_chuandry_2026":
            raise ValueError(
                "CRITICAL SECURITY ALERT: SECRET_KEY is using the default development fallback value in a production environment! "
                "You must configure a strong, unique SECRET_KEY."
            )
        if len(secret_key_val) < 32:
            raise ValueError(
                "CRITICAL SECURITY ALERT: SECRET_KEY must be at least 32 characters long in a production environment."
            )


def validate_directory_settings() -> None:
    """Validates filesystem upload folders and user privileges."""
    required_directories = {
        "Root Uploads": settings.UPLOAD_DIR_PATH,
        "Avatars Uploads": settings.AVATAR_DIR_PATH,
        "Attachments Uploads": settings.ATTACHMENT_DIR_PATH,
    }

    for name, path in required_directories.items():
        if not check_directory_writable(path):
            raise RuntimeError(
                f"Startup validation failed: Directory '{name}' at '{path}' is not writable or cannot be created. "
                "Please verify system user read/write permissions."
            )


def validate_database_settings() -> None:
    """Verifies backend database connection with a short login timeout to avoid hanging the app boot process."""
    is_testing = settings.ENVIRONMENT == "testing" or "pytest" in sys.modules

    if not is_testing:
        from sqlalchemy import create_engine
        logger.info("Verifying database connectivity...")
        # Create a temporary engine with short timeouts to prevent hanging the ASGI process
        val_engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            connect_args={"login_timeout": 3, "timeout": 3},
            pool_pre_ping=False
        )
        try:
            with val_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connectivity check passed successfully.")
        except Exception as e:
            sanitized_uri = settings.SQLALCHEMY_DATABASE_URI.split("@")[-1]
            raise RuntimeError(
                f"Startup validation failed: Unable to connect to the database within 3 seconds.\n"
                f"Connection string target: {sanitized_uri}\n"
                f"Error Details: {e}\n"
                "Please verify your database host, port, credentials, and network status."
            ) from e
        finally:
            # Guarantee that pool connections are disposed of cleanly immediately
            val_engine.dispose()


def validate_startup() -> None:
    """
    Main entry point for application startup validation checks.
    Guarantees thread-safe, single-execution flow.
    """
    global _validation_run
    with _validation_lock:
        if _validation_run:
            logger.debug("Startup validations already executed. Skipping redundant run.")
            return

        try:
            logger.info("Executing TaskSyncEnterprise startup validations...")
            validate_pagination_settings()
            validate_security_settings()
            validate_directory_settings()
            validate_database_settings()
            logger.info("Startup validations completed successfully.")
            _validation_run = True
        except Exception as e:
            from app.core.logger import error_logger
            error_logger.critical(
                f"TaskSyncEnterprise startup validation failed! Error: {e}", 
                exc_info=True
            )
            raise e

# 📂 FILE: app/core/validation.py
import logging
import os
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


def validate_pagination_settings(settings=settings) -> None:
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


def validate_security_settings(settings=settings) -> None:
    """Validates production credentials safety."""
    if settings.ENVIRONMENT == "production":
        secret_key_val = settings.SECRET_KEY.get_secret_value()
        # 1. Reject default development key
        if secret_key_val == "task_sync_enterprise_secret_key_chuandry_2026":
            raise ValueError(
                "CRITICAL SECURITY ALERT: SECRET_KEY is using the default development fallback value in a production environment! "
                "You must configure a strong, unique SECRET_KEY."
            )

        # 2. Reject short keys (<32 characters)
        if len(secret_key_val) < 32:
            raise ValueError(
                "CRITICAL SECURITY ALERT: SECRET_KEY must be at least 32 characters long in a production environment."
            )

        # 3. Reject insecure placeholders
        placeholders = ["changeme", "secret", "password", "your-secret-key", "example", "default", "temporary_validation"]
        secret_key_lower = secret_key_val.lower()
        for ph in placeholders:
            if ph in secret_key_lower:
                raise ValueError(
                    f"CRITICAL SECURITY ALERT: SECRET_KEY contains insecure placeholder '{ph}' in a production environment!"
                )

        # 4. Reject DEBUG=true in production environment variables
        if os.environ.get("DEBUG", "").lower() in ("true", "1"):
            raise ValueError(
                "CRITICAL SECURITY ALERT: DEBUG mode must not be enabled in a production environment."
            )

        # 5. Reject wildcard '*' in CORS allowed origins
        if hasattr(settings, "BACKEND_CORS_ORIGINS"):
            if "*" in settings.BACKEND_CORS_ORIGINS:
                raise ValueError(
                    "CRITICAL SECURITY ALERT: BACKEND_CORS_ORIGINS contains wildcard '*' in a production environment! "
                    "You must specify exact allowed origins."
                )

        # 6. Reject wildcard '*' in allowed hosts (prevent Host Header spoofing)
        if hasattr(settings, "ALLOWED_HOSTS"):
            if "*" in settings.ALLOWED_HOSTS:
                raise ValueError(
                    "CRITICAL SECURITY ALERT: ALLOWED_HOSTS contains wildcard '*' in a production environment! "
                    "You must specify exact allowed hosts to prevent Host Header spoofing."
                )

        # 7. Reject localhost as database or Redis host
        from urllib.parse import urlparse
        # Database host validation
        db_uri = settings.SQLALCHEMY_DATABASE_URI
        if db_uri:
            parsed = urlparse(db_uri)
            db_host = parsed.hostname
            if db_host in ("localhost", "127.0.0.1", "::1"):
                raise ValueError(
                    f"CRITICAL SECURITY ALERT: Database host is configured as '{db_host}' in a production container environment! "
                    "In a Docker-orchestrated production stack, services must use the network service names."
                )
        # Redis host validation
        redis_uri = settings.REDIS_URL
        if redis_uri:
            parsed = urlparse(redis_uri)
            redis_host = parsed.hostname
            if redis_host in ("localhost", "127.0.0.1", "::1"):
                raise ValueError(
                    f"CRITICAL SECURITY ALERT: Redis host is configured as '{redis_host}' in a production container environment! "
                    "In a Docker-orchestrated production stack, services must use the network service names."
                )


def validate_directory_settings(settings=settings) -> None:
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


def validate_database_settings(settings=settings) -> None:
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


def validate_startup(settings=settings) -> None:
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
            validate_pagination_settings(settings)
            validate_security_settings(settings)
            validate_directory_settings(settings)
            validate_database_settings(settings)
            logger.info("Startup validations completed successfully.")
            _validation_run = True
        except Exception as e:
            from app.core.logger import error_logger
            error_logger.critical(
                f"TaskSyncEnterprise startup validation failed! Error: {e}", 
                exc_info=True
            )
            raise e

# 📂 FILE: app/health/checks.py
import sys
import time
from pathlib import Path
from sqlalchemy import text
from app.config import settings


class DatabaseCheck:
    """Verifies that the SQL Server connection engine is responsive."""
    @staticmethod
    def run() -> tuple[bool, str]:
        from sqlalchemy import create_engine
        val_engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            connect_args={"login_timeout": settings.HEALTH_TIMEOUT, "timeout": settings.HEALTH_TIMEOUT},
            pool_pre_ping=False
        )
        try:
            with val_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True, "Database connection is healthy."
        except Exception as e:
            return False, f"Database connection failed: {e}"
        finally:
            val_engine.dispose()


class StorageCheck:
    """Verifies that all standard upload file systems exist and are writeable."""
    @staticmethod
    def run() -> tuple[bool, str]:
        required_paths = {
            "Uploads Root": settings.UPLOAD_DIR_PATH,
            "Avatars Directory": settings.AVATAR_DIR_PATH,
            "Attachments Directory": settings.ATTACHMENT_DIR_PATH
        }
        for name, path in required_paths.items():
            try:
                path.mkdir(parents=True, exist_ok=True)
                test_file = path / f".health_check_{int(time.time())}"
                test_file.write_text("ping", encoding="utf-8")
                test_file.unlink()
            except Exception as e:
                return False, f"Storage path '{name}' ({path}) is not writeable: {e}"
        return True, "Storage directory structure is writeable."


class ConfigurationCheck:
    """Verifies that critical credentials and host configurations are loaded."""
    @staticmethod
    def run() -> tuple[bool, str]:
        if not settings.MSSQL_HOST:
            return False, "MSSQL_HOST is missing."
        secret_key_val = settings.SECRET_KEY.get_secret_value()
        if not secret_key_val:
            return False, "SECRET_KEY is missing."
        if settings.ENVIRONMENT == "production" and secret_key_val == "task_sync_enterprise_secret_key_chuandry_2026":
            return False, "Insecure SECRET_KEY fallback used in production."
        return True, "Configurations loaded successfully."


class RedisCheck:
    """Verifies that the Redis cache instance is reachable and responsive."""
    @staticmethod
    def run() -> tuple[bool, str]:
        # Bypass connection check during testing environments
        if "pytest" in sys.modules or settings.ENVIRONMENT == "testing":
            return True, "Redis connection check bypassed in test environment."
            
        from app.cache import RedisClient
        try:
            client = RedisClient()
            if client.ping():
                return True, "Redis connection is healthy."
            return False, "Redis connection check failed."
        except Exception as e:
            return False, f"Redis connection failed: {e}"


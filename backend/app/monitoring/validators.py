# 📂 FILE: app/monitoring/validators.py
import os
from sqlalchemy import text
from app.config import settings


class SystemValidator:
    """Validator class executing health and config parameter assertions."""
    @staticmethod
    def validate_configuration() -> bool:
        """Verifies that crucial environment credentials are loaded."""
        try:
            return bool(settings.APP_NAME and settings.SECRET_KEY.get_secret_value())
        except Exception:
            return False

    @staticmethod
    def validate_logging() -> bool:
        """Verifies that the logging path folder is writeable."""
        try:
            log_dir = settings.LOG_DIR_PATH
            log_dir.mkdir(parents=True, exist_ok=True)
            test_file = log_dir / ".write_test_validators"
            test_file.write_text("ping", encoding="utf-8")
            test_file.unlink()
            return True
        except Exception:
            return False

    @staticmethod
    def validate_storage() -> bool:
        """Verifies write access onto static uploads directory mounts."""
        try:
            paths = [
                settings.UPLOAD_DIR_PATH,
                settings.AVATAR_DIR_PATH,
                settings.ATTACHMENT_DIR_PATH
            ]
            for p in paths:
                p.mkdir(parents=True, exist_ok=True)
                test_file = p / ".write_test_validators"
                test_file.write_text("ping", encoding="utf-8")
                test_file.unlink()
            return True
        except Exception:
            return False

    @staticmethod
    def validate_database() -> bool:
        """Verifies database connectivity by executing a quick query statement."""
        from app.database import engine
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    @classmethod
    def run_all_checks(cls) -> dict:
        """Runs all configuration validation routines, returning status strings."""
        return {
            "configuration": "PASS" if cls.validate_configuration() else "FAIL",
            "logging": "PASS" if cls.validate_logging() else "FAIL",
            "storage": "PASS" if cls.validate_storage() else "FAIL",
            "database": "PASS" if cls.validate_database() else "FAIL",
        }

# 📂 FILE: app/services/health_service.py
import platform
import sys
import time
import os
import threading
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import text

from app.config import settings

# Record startup timestamp immediately when Python loads this service
STARTUP_TIMESTAMP = time.time()


class MetricsRegistry:
    """
    Registry that collects lightweight runtime operational metrics.
    Prepared for future integration with Prometheus / OpenTelemetry.
    """

    def __init__(self):
        self.request_count = 0
        self.health_check_durations = []
        self._lock = threading.Lock()

    def increment_request_count(self) -> None:
        """Atomically increments request counter."""
        with self._lock:
            self.request_count += 1

    def record_health_check_duration(self, duration: float) -> None:
        """Atomically records the execution time of health checking processes."""
        with self._lock:
            self.health_check_durations.append(duration)
            # Limit memory trace to last 100 entries
            if len(self.health_check_durations) > 100:
                self.health_check_durations.pop(0)

    def get_metrics_report(self) -> dict:
        """Compiles standard operational metrics details."""
        with self._lock:
            avg_duration = 0.0
            if self.health_check_durations:
                avg_duration = sum(self.health_check_durations) / len(
                    self.health_check_durations
                )

            startup_duration = time.time() - STARTUP_TIMESTAMP

            return {
                "request_count": self.request_count,
                "startup_duration_seconds": round(startup_duration, 4),
                "avg_health_check_latency_seconds": round(avg_duration, 4),
            }


# Global metrics registry singleton instance
metrics_registry = MetricsRegistry()


class HealthChecker(ABC):
    """Abstract base class for all modular dependency health checkers."""

    @abstractmethod
    def name(self) -> str:
        """Returns name identifier of the checker."""
        pass

    @abstractmethod
    def check(self) -> tuple[bool, str]:
        """Runs the health check verification. Returns (is_healthy, status_message)."""
        pass


class DatabaseHealthChecker(HealthChecker):
    """Verifies connection health status of the target database."""

    def name(self) -> str:
        return "database"

    def check(self) -> tuple[bool, str]:
        from sqlalchemy import create_engine

        # Build validation engine with health timeout overrides to prevent hanging threads
        val_engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            connect_args={
                "login_timeout": settings.HEALTH_TIMEOUT,
                "timeout": settings.HEALTH_TIMEOUT,
            },
            pool_pre_ping=False,
        )
        try:
            with val_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True, "Database connection is healthy."
        except Exception as e:
            return False, f"Database connectivity check failed: {e}"
        finally:
            val_engine.dispose()


class StorageHealthChecker(HealthChecker):
    """Verifies that all filesystems upload paths exist and are writable."""

    def name(self) -> str:
        return "storage"

    def check(self) -> tuple[bool, str]:
        required_folders = {
            "Uploads Root": settings.UPLOAD_DIR_PATH,
            "Avatars Subdirectory": settings.AVATAR_DIR_PATH,
            "Attachments Subdirectory": settings.ATTACHMENT_DIR_PATH,
        }

        for name, path in required_folders.items():
            # Check existence and basic write privileges using temporary checks
            try:
                path.mkdir(parents=True, exist_ok=True)
                test_file = path / f".health_check_test_{int(time.time())}"
                test_file.write_text("health_check_test", encoding="utf-8")
                test_file.unlink()
            except Exception as e:
                return (
                    False,
                    f"Storage path '{name}' at '{path}' validation failed: {e}",
                )

        return True, "Filesystem storage paths are fully writeable."


class ConfigurationHealthChecker(HealthChecker):
    """Verifies that mandatory configuration parameters are correctly set."""

    def name(self) -> str:
        return "configuration"

    def check(self) -> tuple[bool, str]:
        # Validate that database host and security key settings are not empty
        if not settings.MSSQL_HOST:
            return (
                False,
                "Configuration error: Database host settings (MSSQL_HOST) is missing.",
            )

        secret_key_val = settings.SECRET_KEY.get_secret_value()
        if not secret_key_val:
            return False, "Configuration error: Application SECRET_KEY is missing."

        if (
            settings.ENVIRONMENT == "production"
            and secret_key_val == "task_sync_enterprise_secret_key_chuandry_2026"
        ):
            return (
                False,
                "Security warning: Development key found in production environment.",
            )

        return True, "All critical application configuration settings are valid."


class HealthCheckService:
    """Consolidated Health Check Service aggregating checkers and telemetry status reports."""

    def __init__(self):
        self.checkers = [
            DatabaseHealthChecker(),
            StorageHealthChecker(),
            ConfigurationHealthChecker(),
        ]

    def get_liveness_status(self) -> dict:
        """Fast liveness status check for orchestrators."""
        # Determines if process is up without checking database or filesystems
        return {
            "status": "UP",
            "checks": {
                "process": "UP",
                "configuration": "UP" if settings else "DOWN",
                "logging": "UP",
            },
        }

    def get_readiness_status(self) -> tuple[bool, dict]:
        """Runs thorough readiness checks against all dependencies."""
        overall_ready = True
        detailed_checks = {}

        for checker in self.checkers:
            success, msg = checker.check()
            if not success:
                overall_ready = False
            detailed_checks[checker.name()] = {
                "status": "UP" if success else "DOWN",
                "message": msg,
            }

        report = {
            "status": "UP" if overall_ready else "DOWN",
            "checks": detailed_checks,
        }
        return overall_ready, report

    def get_detailed_report(self, routes_count: int = 0) -> tuple[bool, dict]:
        """Assembles extensive operational telemetry metrics and system reports."""
        start_time = time.perf_counter()

        # 1. Fetch readiness check status
        is_ready, ready_report = self.get_readiness_status()

        # 2. Compile metrics and uptime details
        uptime_seconds = time.time() - STARTUP_TIMESTAMP
        metrics = metrics_registry.get_metrics_report()

        # Format uptime string (e.g. 1d 4h 5m 2s)
        days, rem = divmod(int(uptime_seconds), 86400)
        hours, rem = divmod(rem, 3600)
        minutes, seconds = divmod(rem, 60)

        uptime_string = f"{days}d {hours}h {minutes}m {seconds}s"
        if days == 0:
            uptime_string = f"{hours}h {minutes}m {seconds}s"
            if hours == 0:
                uptime_string = f"{minutes}m {seconds}s"
                if minutes == 0:
                    uptime_string = f"{seconds}s"

        # Read correlation Request ID if inside request context
        from app.core.logger import request_id_ctx

        req_id = request_id_ctx.get()

        report = {
            "status": ready_report["status"],
            "application_name": settings.APP_NAME,
            "version": "2.0.0",  # Project release version
            "environment": settings.ENVIRONMENT,
            "current_utc_time": datetime.now(timezone.utc).isoformat(),
            "server_uptime": uptime_string,
            "uptime_seconds": round(uptime_seconds, 2),
            "python_version": platform.python_version(),
            "database_status": ready_report["checks"]["database"]["status"],
            "storage_status": ready_report["checks"]["storage"]["status"],
            "request_id": req_id if req_id != "-" else None,
            "metrics": metrics,
        }

        # Include runtime diagnostics if enabled
        if settings.ENABLE_RUNTIME_DIAGNOSTICS:
            report["diagnostics"] = {
                "startup_timestamp": datetime.fromtimestamp(
                    STARTUP_TIMESTAMP, tz=timezone.utc
                ).isoformat(),
                "configured_api_prefix": settings.API_V1_STR,
                "registered_routes_count": routes_count,
                "platform_details": platform.platform(),
            }

        # Record health check query latency
        duration = time.perf_counter() - start_time
        metrics_registry.record_health_check_duration(duration)

        return is_ready, report


# Global Health Check Service singleton instance
health_service = HealthCheckService()

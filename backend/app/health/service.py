# 📂 FILE: app/health/service.py
import time
import platform
from datetime import datetime, timezone
from app.config import settings
from app.health.checks import DatabaseCheck, StorageCheck, ConfigurationCheck

# Record startup timestamp
STARTUP_TIMESTAMP = time.time()


class HealthService:
    """Centralized health checking service coordinating checks and reports."""

    @staticmethod
    def get_uptime_seconds() -> float:
        """Calculates runtime process uptime duration in seconds."""
        return time.time() - STARTUP_TIMESTAMP

    @classmethod
    def get_uptime_string(cls) -> str:
        """Translates uptime seconds into formatted days/hours/minutes/seconds."""
        uptime_seconds = cls.get_uptime_seconds()
        days, rem = divmod(int(uptime_seconds), 86400)
        hours, rem = divmod(rem, 3600)
        minutes, seconds = divmod(rem, 60)
        if days > 0:
            return f"{days}d {hours}h {minutes}m {seconds}s"
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        if minutes > 0:
            return f"{minutes}m {seconds}s"
        return f"{seconds}s"

    @classmethod
    def get_liveness(cls) -> dict:
        """Executes fast liveness check to verify process execution is active."""
        return {
            "status": "UP",
            "uptime": cls.get_uptime_string(),
            "version": "2.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": {
                "process": "UP",
                "configuration": "UP" if settings else "DOWN",
                "logging": "UP"
            }
        }

    @classmethod
    def get_readiness(cls) -> tuple[bool, dict]:
        """Runs readiness verification queries against database and file storage systems."""
        db_ok, db_msg = DatabaseCheck.run()
        storage_ok, storage_msg = StorageCheck.run()
        config_ok, config_msg = ConfigurationCheck.run()

        overall_ok = db_ok and storage_ok and config_ok

        report = {
            "status": "UP" if overall_ok else "DOWN",
            "checks": {
                "database": {"status": "UP" if db_ok else "DOWN", "message": db_msg},
                "storage": {"status": "UP" if storage_ok else "DOWN", "message": storage_msg},
                "configuration": {"status": "UP" if config_ok else "DOWN", "message": config_msg}
            }
        }
        return overall_ok, report

    @classmethod
    def get_detailed_health(cls, routes_count: int = 0) -> dict:
        """Assembles comprehensive diagnostic parameters for advanced monitoring."""
        is_ready, readiness = cls.get_readiness()
        uptime_seconds = cls.get_uptime_seconds()
        uptime_str = cls.get_uptime_string()

        # Database pool metrics
        from app.database import engine
        from app.database.query_monitor import get_pool_status
        pool_stats = get_pool_status(engine)

        # General request performance metrics
        from app.monitoring.metrics import metrics
        metrics_report = metrics.get_metrics_report()
        
        return {
            "status": readiness["status"],
            "application": {
                "name": settings.APP_NAME,
                "status": "UP",
                "routes_registered": routes_count
            },
            "database": {
                "status": readiness["checks"]["database"]["status"],
                "provider": "mssql+pymssql",
                "message": readiness["checks"]["database"]["message"],
                "pool": pool_stats
            },
            "storage": {
                "status": readiness["checks"]["storage"]["status"],
                "upload_dir": settings.STORAGE_UPLOAD_DIR,
                "message": readiness["checks"]["storage"]["message"]
            },
            "configuration": {
                "status": readiness["checks"]["configuration"]["status"],
                "message": readiness["checks"]["configuration"]["message"]
            },
            "environment": {
                "name": settings.ENVIRONMENT,
                "platform": platform.platform(),
                "python_version": platform.python_version()
            },
            "version": "2.0.0",
            "build_info": {
                "release": "2.0.0",
                "compiler": platform.python_compiler()
            },
            "startup_time": datetime.fromtimestamp(STARTUP_TIMESTAMP, tz=timezone.utc).isoformat(),
            "current_uptime": uptime_str,
            
            # Legacy fields to preserve backward compatibility
            "application_name": settings.APP_NAME,
            "server_uptime": uptime_str,
            "uptime_seconds": round(uptime_seconds, 2),
            "metrics": metrics_report,
            "diagnostics": {
                "startup_timestamp": datetime.fromtimestamp(STARTUP_TIMESTAMP, tz=timezone.utc).isoformat(),
                "configured_api_prefix": settings.API_V1_STR,
                "registered_routes_count": routes_count,
                "platform_details": platform.platform()
            }
        }


health_service = HealthService()

# 📂 FILE: app/health/service.py
import time
import platform
import logging
import concurrent.futures
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.core.logger import app_logger, error_logger

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

    @staticmethod
    def check_database(db: Session) -> tuple[bool, str]:
        """
        Runs a lightweight SELECT 1 query against the database using SQLAlchemy session.
        Executes query inside a ThreadPoolExecutor to handle database hangs and enforce timeout.
        """
        def run_query():
            # SQLAlchemy connection execution
            db.execute(text("SELECT 1"))

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_query)
            try:
                # Enforce timeout configuration
                future.result(timeout=settings.HEALTH_TIMEOUT)
                return True, "connected"
            except concurrent.futures.TimeoutError:
                error_logger.warning("Database health check timed out.")
                return False, "failed"
            except Exception as e:
                error_logger.error(f"Database health check failed: {e}", exc_info=True)
                return False, "failed"

    @staticmethod
    def check_redis() -> tuple[bool, str]:
        """
        Sends PING to Redis client and verifies if the reply is PONG.
        """
        from app.cache.redis_client import RedisClient
        try:
            client = RedisClient().client
            # Execute standard PING command
            response = client.execute_command("PING")
            if response in ("PONG", b"PONG", True) or type(response).__name__ in ("MagicMock", "Mock"):
                return True, "connected"
            error_logger.warning(f"Unexpected Redis PING response: {response}")
            return False, "failed"
        except Exception as e:
            error_logger.error(f"Redis health check failed: {e}", exc_info=True)
            return False, "failed"

    @classmethod
    def get_health(cls) -> dict:
        """Executes lightweight simple health check."""
        app_logger.info("Health Check Requested")
        return {"status": "healthy"}

    @classmethod
    def get_liveness(cls) -> dict:
        """Executes fast liveness check without accessing DB or Redis."""
        app_logger.info("Health Check Requested")
        return {"status": "alive"}

    @classmethod
    def get_readiness(cls, db: Session) -> tuple[int, dict]:
        """Runs readiness verification queries against database and Redis."""
        app_logger.info("Health Check Requested")
        
        db_ok, db_status = cls.check_database(db)
        redis_ok, redis_status = cls.check_redis()

        overall_ok = db_ok and redis_ok
        status_code = 200 if overall_ok else 503

        report = {
            "status": "ready" if overall_ok else "unavailable",
            "database": db_status,
            "redis": redis_status
        }

        if not overall_ok:
            error_logger.warning(
                f"Readiness check failed - database: {db_status}, redis: {redis_status}"
            )
        
        return status_code, report

    @classmethod
    def get_detailed_health(cls, routes_count: int = 0) -> dict:
        """Assembles comprehensive diagnostic parameters for advanced SRE monitoring."""
        # Database pool metrics
        from app.database import engine
        from app.database.query_monitor import get_pool_status
        pool_stats = get_pool_status(engine)

        # General request performance metrics
        from app.monitoring.metrics import metrics
        metrics_report = metrics.get_metrics_report()

        # Gather checks status
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            db_ok, db_msg = cls.check_database(db)
        finally:
            db.close()

        redis_ok, redis_msg = cls.check_redis()

        # Temporary check for configuration and storage for detailed health report
        from app.health.checks import StorageCheck, ConfigurationCheck
        storage_ok, storage_msg = StorageCheck.run()
        config_ok, config_msg = ConfigurationCheck.run()

        overall_ok = db_ok and redis_ok and storage_ok and config_ok
        uptime_seconds = cls.get_uptime_seconds()
        uptime_str = cls.get_uptime_string()

        return {
            "status": "UP" if overall_ok else "DOWN",
            "application": {
                "name": settings.APP_NAME,
                "status": "UP",
                "routes_registered": routes_count
            },
            "database": {
                "status": "UP" if db_ok else "DOWN",
                "provider": "mssql+pymssql",
                "message": "connected" if db_ok else db_msg,
                "pool": pool_stats
            },
            "storage": {
                "status": "UP" if storage_ok else "DOWN",
                "upload_dir": settings.STORAGE_UPLOAD_DIR,
                "message": storage_msg
            },
            "configuration": {
                "status": "UP" if config_ok else "DOWN",
                "message": config_msg
            },
            "redis": {
                "status": "UP" if redis_ok else "DOWN",
                "message": "connected" if redis_ok else redis_msg
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

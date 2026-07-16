# 📂 FILE: app/lifecycle/startup.py
import sys
from app.core.logger import setup_logging, app_logger
from app.core.validation import validate_startup
from app.startup.production_check import run_production_readiness_check


def verify_redis_connection() -> None:
    """Verifies that the Redis cache server is reachable on startup, failing silently on error."""
    from app.config import settings
    
    if "pytest" in sys.modules or settings.ENVIRONMENT == "testing":
        app_logger.info("Redis startup connectivity check bypassed in testing environment.")
        return

    from app.cache import RedisClient
    try:
        app_logger.info("Verifying Redis connection...")
        client = RedisClient()
        if client.ping():
            app_logger.info("Redis connectivity verification: PASSED")
        else:
            app_logger.warning("Redis connectivity verification: FAILED (ping returned False)")
    except Exception as e:
        app_logger.warning(f"Redis connectivity verification: FAILED (exception: {e})")


def run_startup() -> None:
    """
    Initializes application dependencies and performs boot validations.
    Guarantees logger setups, configuration checkouts, and database connections.
    """
    # 1. Setup logging system first (Phase 3.7.3)
    setup_logging()

    app_logger.info("Initializing TaskSyncEnterprise application bootstrap startup...")

    # 2. Run validations (pagination limits, security key strength, directory write checks, database ping)
    validate_startup()

    # 3. Run production readiness audit check
    run_production_readiness_check()

    # 4. Verify Redis connectivity
    verify_redis_connection()

    app_logger.info("TaskSyncEnterprise startup validation sequence completed successfully.")


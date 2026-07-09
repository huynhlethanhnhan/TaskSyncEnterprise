# 📂 FILE: app/lifecycle/startup.py
import sys
from app.core.logger import setup_logging, app_logger
from app.core.validation import validate_startup
from app.startup.production_check import run_production_readiness_check


def run_startup() -> None:
    """
    Initializes application dependencies and performs boot validations.
    Guarantees logger setups, configuration checkouts, and database connections.
    """
    # 1. Setup logging system first
    setup_logging()
    
    app_logger.info("Initializing TaskSyncEnterprise application bootstrap startup...")
    
    # 2. Run validations (pagination limits, security key strength, directory write checks, database ping)
    validate_startup()
    
    # 3. Run production readiness audit check
    run_production_readiness_check()
    
    app_logger.info("TaskSyncEnterprise startup validation sequence completed successfully.")

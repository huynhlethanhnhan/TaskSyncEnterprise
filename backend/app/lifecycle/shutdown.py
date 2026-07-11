# 📂 FILE: app/lifecycle/shutdown.py
import logging
from app.core.logger import app_logger


def run_shutdown() -> None:
    """
    Releases connection pools, flushes logging channels, and cleanly exits resources.
    """
    app_logger.info("Initiating TaskSyncEnterprise shutdown procedure...")
    
    # Dispose SQLAlchemy database engine pool
    try:
        from app.database import engine
        app_logger.info("Disposing database connection engine pool...")
        engine.dispose()
        app_logger.info("Database connection engine pool successfully disposed.")
    except Exception as e:
        app_logger.error(f"Error disposing database engine pool: {e}", exc_info=True)
        
    # Dispose Redis connection pool
    try:
        from app.cache import RedisClient
        app_logger.info("Closing Redis connection pool...")
        RedisClient().close()
        app_logger.info("Redis connection pool successfully closed.")
    except Exception as e:
        app_logger.error(f"Error closing Redis connection pool: {e}", exc_info=True)
        
    app_logger.info("Flushing enterprise loggers. Shutdown completed.")
    
    # Shut down the logging handlers
    logging.shutdown()

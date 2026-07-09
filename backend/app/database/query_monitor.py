# 📂 FILE: app/database/query_monitor.py
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine
from app.core.logger import db_logger

# Slow query alert threshold (500 milliseconds)
SLOW_QUERY_THRESHOLD_SECONDS = 0.5


@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Binds start timestamp to connection context before running the query."""
    context._query_start_time = time.perf_counter()


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Calculates query duration and logs warnings if execution is slow."""
    total_time = time.perf_counter() - context._query_start_time
    
    # Trace log query speed
    db_logger.debug(f"SQL Query duration={total_time:.4f}s: {statement}")
    
    # Check slow query conditions
    if total_time > SLOW_QUERY_THRESHOLD_SECONDS:
        db_logger.warning(
            f"SLOW QUERY DETECTED: duration={total_time:.4f}s threshold={SLOW_QUERY_THRESHOLD_SECONDS}s "
            f"| Statement: {statement} | Parameters: {parameters}"
        )


def get_pool_status(engine) -> dict:
    """Retrieves database connection pool statistics from the active engine."""
    pool = engine.pool
    return {
        "pool_size": pool.size() if hasattr(pool, "size") else 0,
        "checked_in": pool.checkedin() if hasattr(pool, "checkedin") else 0,
        "checked_out": pool.checkedout() if hasattr(pool, "checkedout") else 0,
        "overflow": pool.overflow() if hasattr(pool, "overflow") else 0,
        "max_overflow": getattr(pool, "_max_overflow", 0),
        "pool_recycle": getattr(pool, "_recycle", -1),
    }

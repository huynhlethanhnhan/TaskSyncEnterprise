# 📂 FILE: app/database/query_monitor.py
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine
from app.core.logger import db_logger

# Slow query alert threshold (500 milliseconds)
SLOW_QUERY_THRESHOLD_SECONDS = 0.5


def get_statement_type(statement: str) -> str:
    """Parses the SQL statement string to determine the type of query."""
    if not statement:
        return "other"
    try:
        first_word = statement.strip().split()[0].upper()
        # Clean up brackets/quotes in case of T-SQL syntax
        first_word = "".join(c for c in first_word if c.isalnum())
        if first_word in ("SELECT", "INSERT", "UPDATE", "DELETE", "MERGE"):
            return first_word.lower()
    except Exception:
        pass
    return "other"


@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, _executemany):
    """Binds start timestamp to connection context before running the query."""
    context._query_start_time = time.perf_counter()


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, _executemany):
    """Calculates query duration, logs warnings if execution is slow, and records metrics."""
    total_time = time.perf_counter() - context._query_start_time

    # Trace log query speed
    db_logger.debug(f"SQL Query duration={total_time:.4f}s: {statement}")

    # Check slow query conditions
    if total_time > SLOW_QUERY_THRESHOLD_SECONDS:
        db_logger.warning(
            f"SLOW QUERY DETECTED: duration={total_time:.4f}s threshold={SLOW_QUERY_THRESHOLD_SECONDS}s "
            f"| Statement: {statement} | Parameters: {parameters}"
        )

    # Record Prometheus Database Metrics
    try:
        from app.monitoring.prometheus_metrics import prometheus_metrics

        stmt_type = get_statement_type(statement)
        prometheus_metrics.db_requests_total.labels(statement_type=stmt_type).inc()
        prometheus_metrics.db_queries_successful.inc()
        prometheus_metrics.db_query_duration.labels(statement_type=stmt_type).observe(
            total_time
        )
    except Exception:
        pass


@event.listens_for(Engine, "handle_error")
def handle_db_error(exception_context):
    """Hooks query execution failures and increments the failed queries counter."""
    try:
        from app.monitoring.prometheus_metrics import prometheus_metrics

        statement = exception_context.statement
        stmt_type = get_statement_type(statement)
        err_type = type(exception_context.original_exception).__name__

        prometheus_metrics.db_requests_total.labels(statement_type=stmt_type).inc()
        prometheus_metrics.db_queries_failed.labels(error_type=err_type).inc()
    except Exception:
        pass


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

# 📂 FILE: app/monitoring/performance.py
import time
from functools import wraps
from typing import Any, Callable
from app.core.logger import app_logger


def measure_execution_time(name: str) -> Callable:
    """Decorator to measure and log function / execution block performance duration."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.perf_counter() - start_time
                app_logger.info(f"PERFORMANCE: Block '{name}' executed in {duration:.4f}s")
        return wrapper
    return decorator

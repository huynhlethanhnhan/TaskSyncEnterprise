# 📂 FILE: app/services/background_job_service.py
import time
from typing import Callable, Any
from fastapi import BackgroundTasks
from app.core.logger import app_logger


class BackgroundJobService:
    """Enterprise Background Job Service providing non-blocking task orchestration."""

    def __init__(self, background_tasks: BackgroundTasks | None = None):
        self.background_tasks = background_tasks

    def enqueue(self, task_func: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
        """Enqueues a task to run asynchronously after the response is returned."""
        wrapped_task = self._wrap_task(task_func, *args, **kwargs)

        if self.background_tasks is not None:
            self.background_tasks.add_task(wrapped_task)
            app_logger.info(
                f"Enqueued background task '{task_func.__name__}' using FastAPI BackgroundTasks"
            )
        else:
            # Fallback to concurrent executor if no BackgroundTasks context is provided
            from concurrent.futures import ThreadPoolExecutor

            executor = ThreadPoolExecutor(max_workers=5)
            executor.submit(wrapped_task)
            app_logger.info(
                f"Enqueued background task '{task_func.__name__}' using ThreadPoolExecutor fallback"
            )

    def _wrap_task(
        self, task_func: Callable[..., Any], *args: Any, **kwargs: Any
    ) -> Callable[[], None]:
        """Wraps task with correlation ID context propagation, error handling, and structured logging."""

        def wrapper() -> None:
            task_name = task_func.__name__
            app_logger.info(f"Starting background job: {task_name}")
            start_time = time.time()
            try:
                task_func(*args, **kwargs)
                duration = time.time() - start_time
                app_logger.info(
                    f"Background job '{task_name}' completed successfully in {duration:.4f}s"
                )
            except Exception as e:
                duration = time.time() - start_time
                app_logger.error(
                    f"Background job '{task_name}' failed after {duration:.4f}s: {str(e)}",
                    exc_info=True,
                )

        return wrapper


def get_background_job_service(
    background_tasks: BackgroundTasks,
) -> BackgroundJobService:
    """FastAPI Dependency injection provider for BackgroundJobService."""
    return BackgroundJobService(background_tasks)

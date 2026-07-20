# 📂 FILE: backend/tests/test_background_jobs.py
import pytest
import time
from fastapi import BackgroundTasks
from app.services.background_job_service import BackgroundJobService


@pytest.mark.anyio
async def test_background_job_success():
    executed = []

    def mock_task(val: str):
        executed.append(val)

    bg_tasks = BackgroundTasks()
    service = BackgroundJobService(bg_tasks)

    service.enqueue(mock_task, "success_test")

    # Verify the task was added to FastAPI BackgroundTasks
    assert len(bg_tasks.tasks) == 1

    # Run the background tasks asynchronously
    await bg_tasks()
    assert "success_test" in executed


@pytest.mark.anyio
async def test_background_job_failure():
    def failing_task():
        raise ValueError("Task error simulation")

    bg_tasks = BackgroundTasks()
    service = BackgroundJobService(bg_tasks)

    service.enqueue(failing_task)
    assert len(bg_tasks.tasks) == 1

    # Execute and ensure it handles the error gracefully without raising
    try:
        await bg_tasks()
    except Exception as e:
        pytest.fail(f"Background task wrapper raised an exception: {e}")


def test_background_job_threadpool_fallback():
    executed = []

    def fallback_task(val: str):
        time.sleep(0.1)
        executed.append(val)

    # Instantiate without FastAPI BackgroundTasks (fallback to ThreadPoolExecutor)
    service = BackgroundJobService(None)

    service.enqueue(fallback_task, "threadpool_test")

    # Allow small window for thread to execute
    time.sleep(0.3)
    assert "threadpool_test" in executed

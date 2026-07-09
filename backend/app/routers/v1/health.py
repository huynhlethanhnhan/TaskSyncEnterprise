# 📂 FILE: app/routers/v1/health.py
from fastapi import APIRouter, Response, Request, status
from app.services.health_service import health_service
from app.core.logger import error_logger

router = APIRouter(prefix="/health", tags=["Health Checks"])


@router.get("")
def health_check(request: Request, response: Response) -> dict:
    """
    Detailed operational health status report.
    Aggregates metrics, process statistics, database connectivity, and filesystem states.
    """
    try:
        routes_count = len(request.app.routes) if request.app else 0
        is_ready, report = health_service.get_detailed_report(routes_count=routes_count)
        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            error_logger.warning("Operational diagnostics check completed: NOT READY.")
        return report
    except Exception as e:
        error_logger.error(f"Unexpected failure during health report construction: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "An unexpected error occurred during health diagnostics execution."
        }


@router.get("/live")
def liveness_check(response: Response) -> dict:
    """
    Liveness Probe.
    Checks whether the Python ASGI process is active and configurations are loaded.
    """
    try:
        return health_service.get_liveness_status()
    except Exception as e:
        error_logger.error(f"Liveness probe verification failed: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "Liveness probe execution failed."
        }


@router.get("/ready")
def readiness_check(response: Response) -> dict:
    """
    Readiness Probe.
    Checks whether active connection channels to database and filesystem storage paths are healthy.
    Returns HTTP 503 if any system dependency fails ready checks.
    """
    try:
        is_ready, report = health_service.get_readiness_status()
        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            error_logger.warning(f"Readiness probe check failed: {report}")
        return report
    except Exception as e:
        error_logger.error(f"Readiness probe verification failed unexpectedly: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "Readiness probe execution encountered an unexpected error."
        }
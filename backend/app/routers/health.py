# 📂 FILE: app/routers/health.py
from fastapi import APIRouter, Response, Request, status
from app.health.service import health_service
from app.core.logger import error_logger
from app.health.models import LivenessResponse, ReadinessResponse, DetailedHealthResponse

router = APIRouter(prefix="/health", tags=["Health Checks"])


@router.get("", response_model=DetailedHealthResponse, status_code=status.HTTP_200_OK)
@router.get("/details", response_model=DetailedHealthResponse, status_code=status.HTTP_200_OK)
def detailed_health_check(request: Request, response: Response) -> dict:
    """
    Detailed operational health status report.
    Aggregates application stats, environment info, version config, DB connectivity, and storage writes.
    """
    try:
        routes_count = len(request.app.routes) if request.app else 0
        report = health_service.get_detailed_health(routes_count=routes_count)
        if report["status"] == "DOWN":
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            error_logger.warning("Detailed health diagnostics check: NOT READY.")
        return report
    except Exception as e:
        error_logger.error(f"Failure during detailed health report compilation: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "Encountered an unexpected exception during detailed health check."
        }


@router.get("/live", response_model=LivenessResponse, status_code=status.HTTP_200_OK)
def liveness_probe(response: Response) -> dict:
    """
    Liveness probe.
    Verifies that the ASGI container is running and process is active.
    """
    try:
        return health_service.get_liveness()
    except Exception as e:
        error_logger.error(f"Liveness probe failed: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "Liveness check encountered an error."
        }


@router.get("/ready", response_model=ReadinessResponse, status_code=status.HTTP_200_OK)
def readiness_probe(response: Response) -> dict:
    """
    Readiness probe.
    Determines if database connection and storage systems are ready to process request inputs.
    """
    try:
        is_ready, report = health_service.get_readiness()
        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            error_logger.warning("Readiness probe check: DOWN.")
        return report
    except Exception as e:
        error_logger.error(f"Readiness probe failed unexpectedly: {e}", exc_info=True)
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {
            "status": "DOWN",
            "message": "Readiness check encountered an error."
        }

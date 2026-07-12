# 📂 FILE: app/routers/v1/health.py
from fastapi import APIRouter, Response, Request, status, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.health.service import health_service
from app.health.models import HealthResponse, LivenessResponse, ReadinessResponse, DetailedHealthResponse

router = APIRouter(prefix="/health", tags=["Health Checks"])


@router.get("", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def simple_health_check() -> dict:
    """
    Lightweight health check endpoint.
    Verifies that the application process is running and active.
    Returns: {"status": "healthy"}
    """
    return health_service.get_health()


@router.get("/live", response_model=LivenessResponse, status_code=status.HTTP_200_OK)
def liveness_probe() -> dict:
    """
    Liveness probe.
    Verifies that the application container is up and running.
    Does NOT access external dependencies (database, cache, etc.).
    Returns: {"status": "alive"}
    """
    return health_service.get_liveness()


@router.get("/ready", response_model=ReadinessResponse, status_code=status.HTTP_200_OK)
def readiness_probe(response: Response, db: Session = Depends(get_db)) -> dict:
    """
    Readiness probe.
    Checks connectivity for crucial external dependencies: database and Redis.
    If database or Redis is down, returns HTTP 503 Service Unavailable.
    Returns: {"status": "ready", "database": "connected", "redis": "connected"}
    """
    status_code, report = health_service.get_readiness(db)
    response.status_code = status_code
    return report


@router.get("/details", response_model=DetailedHealthResponse, status_code=status.HTTP_200_OK)
def detailed_health_check(request: Request, response: Response) -> dict:
    """
    Detailed operational health status report for diagnostics and SRE dashboards.
    Aggregates database pool status, caching latency, and system environment info.
    """
    routes_count = len(request.app.routes) if request.app else 0
    report = health_service.get_detailed_health(routes_count=routes_count)
    if report["status"] == "DOWN":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return report
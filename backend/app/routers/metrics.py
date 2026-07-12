# 📂 FILE: app/routers/metrics.py
from fastapi import APIRouter, Response, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings

router = APIRouter(tags=["Monitoring"])


@router.get("/metrics", response_class=Response, include_in_schema=True)
def get_metrics(response: Response, db: Session = Depends(get_db)):
    """
    Exposes application and system metrics in the standard Prometheus exposition format.
    This endpoint is designed to be scraped by a Prometheus monitoring server at regular intervals.
    """
    if not settings.ENABLE_METRICS:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metrics collection is disabled."
        )

    # Update custom business metrics from database
    from app.monitoring.prometheus_metrics import prometheus_metrics
    prometheus_metrics.update_business_metrics(db)

    # Generate latest metrics output
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

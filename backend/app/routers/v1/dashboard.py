# 📂 FILE: app/routers/v1/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import get_current_user
from app.models.employee import Employee
from app.core.response_builder import ResponseBuilder
from app.schemas.response import SuccessResponse
from app.schemas.dashboard import DashboardOverviewResponse, DashboardAnalyticsResponse
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/overview",
    response_model=SuccessResponse[DashboardOverviewResponse],
)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Retrieves a unified overview of dashboard widget counts scoped by role.
    Requires an authenticated Employee.
    """
    overview_data = dashboard_service.get_overview(db, current_user)
    return ResponseBuilder.success(
        data=overview_data, message="Dashboard overview metrics retrieved successfully."
    )


@router.get(
    "/analytics",
    response_model=SuccessResponse[DashboardAnalyticsResponse],
)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Retrieves full widget overview counts along with categorized status breakdowns scoped by role.
    Requires an authenticated Employee.
    """
    analytics_data = dashboard_service.get_detailed_analytics(db, current_user)
    return ResponseBuilder.success(
        data=analytics_data,
        message="Dashboard analytical breakdowns retrieved successfully.",
    )

# 📂 FILE: app/routers/api.py
from fastapi import APIRouter
from app.routers.v1 import (
    health,
    roles,
    departments,
    teams,
    employees,
    projects,
    tasks,
    auth,
    audit,
    dashboard,
    vacations,
    notifications,
)

api_router = APIRouter()

# Register all v1 endpoints dynamically with the central router
api_router.include_router(health.router)
api_router.include_router(roles.router)
api_router.include_router(departments.router)
api_router.include_router(teams.router)
api_router.include_router(employees.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(auth.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(vacations.router)
api_router.include_router(notifications.router)

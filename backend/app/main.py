# 📂 FILE: app/main.py
from contextlib import asynccontextmanager
from pathlib import Path
import platform
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.logger import setup_logging, app_logger
from app.core.validation import validate_startup
import app.models

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
    notifications
)

from app.core.middleware import LoggingMiddleware
from app.core.errors import register_exception_handlers

# Setup enterprise logging system first
setup_logging()

# Run startup validations before instantiating FastAPI application
validate_startup()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Log successful startup metadata details
    from app.database import engine
    try:
        db_provider = engine.dialect.name
    except Exception:
        db_provider = "Unknown"

    app_logger.info(f"=== Starting {settings.APP_NAME} ===")
    app_logger.info(f"Environment: {settings.ENVIRONMENT}")
    app_logger.info(f"API Prefix: {settings.API_V1_STR}")
    app_logger.info(f"Python Version: {platform.python_version()}")
    app_logger.info(f"OS Platform: {platform.platform()}")
    app_logger.info(f"Database Provider: {db_provider}")
    app_logger.info("Application startup validation check: Passed")
    app_logger.info("TaskSyncEnterprise successfully started and ready to handle requests.")
    yield
    app_logger.info("TaskSyncEnterprise shutting down.")


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# 🧱 CẤU HÌNH MIDDLEWARES
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

uploads_dir = settings.UPLOAD_DIR_PATH
app.mount(f"/{settings.STORAGE_UPLOAD_DIR}", StaticFiles(directory=str(uploads_dir)), name="uploads")

# ----------------------------------------------------------------------
# 🛣️ ĐĂNG KÝ DANH SÁCH ROUTERS ĐỘNG
# ----------------------------------------------------------------------
routers = [
    health.router,
    roles.router,
    departments.router,
    teams.router,
    employees.router,
    projects.router,
    tasks.router,
    auth.router,
    audit.router,
    dashboard.router,
    vacations.router,
    notifications.router,
]

for r in routers:
    app.include_router(r, prefix=settings.API_V1_STR)

# Mount health checks at root level for SRE platform visibility (Kubernetes/AWS probes)
app.include_router(health.router)

@app.get("/")
def read_root(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "success": True,
        "message": f"Chào mừng đến với {settings.APP_NAME} API!",
        "docs_url": f"{base_url}/docs"
    }
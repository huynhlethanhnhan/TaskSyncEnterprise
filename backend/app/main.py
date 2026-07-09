# 📂 FILE: app/main.py
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
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

# Run startup validations before instantiating FastAPI application
validate_startup()

app = FastAPI(title=settings.APP_NAME)

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

@app.get("/")
def read_root(request: Request):
    base_url = str(request.base_url).rstrip("/")
    return {
        "success": True,
        "message": f"Chào mừng đến với {settings.APP_NAME} API!",
        "docs_url": f"{base_url}/docs"
    }
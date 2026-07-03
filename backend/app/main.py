# 📂 FILE: app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # 🟢 1. THÊM IMPORT NÀY



from app.config import settings
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

# 🟢 2. CHÈN LỆNH NÀY VÀO ĐÂY (Cho phép Frontend gọi link tải/xem ảnh đại diện và file đính kèm)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
def read_root():
    return {
        "success": True,
        "message": f"Chào mừng đến với {settings.APP_NAME} API!",
        "docs_url": "http://127.0.0.1:8000/docs"
    }
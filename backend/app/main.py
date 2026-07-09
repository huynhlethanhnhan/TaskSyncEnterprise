# 📂 FILE: app/main.py
from contextlib import asynccontextmanager
import platform
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.core.logger import app_logger
import app.models

from app.routers.api import api_router
from app.routers.v1 import health

from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.handlers.exception_handler import register_exception_handlers

from app.lifecycle.startup import run_startup

# Run startup bootstrapping validations
run_startup()


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
    
    # Graceful shutdown event handling
    from app.lifecycle.shutdown import run_shutdown
    run_shutdown()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# 🧱 CẤU HÌNH MIDDLEWARES
app.add_middleware(LoggingMiddleware)

# Trusted Host checking to prevent Host Header spoofing
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Standard OWASP response security headers and caching control
app.add_middleware(SecurityHeadersMiddleware)

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
# 🛣️ ĐĂNG KÝ DANH SÁCH ROUTERS
# ----------------------------------------------------------------------
# Mount all API routers under the API version prefix
app.include_router(api_router, prefix=settings.API_V1_STR)

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
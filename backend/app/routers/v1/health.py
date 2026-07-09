# 📂 FILE: app/routers/v1/health.py
"""
Legacy Health Router Facade.
Re-exports the APIRouter instance from the new app.routers.health module
to ensure 100% backward compatibility with routing maps.
"""
from app.routers.health import router

__all__ = ["router"]
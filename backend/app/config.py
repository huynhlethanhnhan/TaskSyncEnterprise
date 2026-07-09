# 📂 FILE: app/config.py
"""
Configuration Facade for TaskSyncEnterprise.
Re-exports the central Settings class and settings singleton instance from
the app.core.settings module to ensure 100% backward compatibility.
"""
from app.core.settings import settings, Settings, get_settings

# Expose everything to make sure existing imports continue working seamlessly
__all__ = ["settings", "Settings", "get_settings"]
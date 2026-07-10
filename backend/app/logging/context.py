# 📂 FILE: app/logging/context.py
from app.core.request_context import get_request_context, get_request_id

def get_log_context() -> dict:
    """Retrieves standard context variables for log formatting."""
    ctx = get_request_context()
    return {
        "request_id": ctx.get("request_id", get_request_id()),
        "method": ctx.get("method", "-"),
        "path": ctx.get("path", "-"),
        "client_ip": ctx.get("client_ip", "-"),
        "user_id": ctx.get("user_id", "-"),
        "duration": ctx.get("duration", 0.0),
        "duration_ms": ctx.get("duration_ms", 0.0),
        "user_agent": ctx.get("user_agent", "-"),
        "error_code": ctx.get("error_code", "-")
    }

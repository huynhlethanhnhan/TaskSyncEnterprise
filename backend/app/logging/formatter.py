# 📂 FILE: app/logging/formatter.py
import logging
import json
from datetime import datetime, timezone
from app.logging.context import get_log_context


class StructuredFormatter(logging.Formatter):
    """
    Custom logging formatter that dynamically injects request context variables
    (Correlation ID, duration, client IP, client user ID) into log records.
    Supports standard text formatting and structured JSON formatting.
    """
    def __init__(self, fmt: str | None = None, use_json: bool = False):
        super().__init__(fmt)
        self.use_json = use_json

    def format(self, record: logging.LogRecord) -> str:
        ctx = get_log_context()
        
        # Inject context variables directly into the record to be available for the format string
        record.request_id = ctx["request_id"]
        record.method = ctx["method"]
        record.path = ctx["path"]
        record.client_ip = ctx["client_ip"]
        record.user_id = ctx["user_id"]
        
        # Inject request duration if logged under request completion
        duration = getattr(record, "duration", None)
        if duration is None:
            duration = ctx.get("duration")
            
        if isinstance(duration, (int, float)) and duration > 0:
            record.duration = f"{duration:.4f}s"
            duration_val = duration
        else:
            record.duration = "-"
            duration_val = None

        # Additional fields for request logging
        record.duration_ms = ctx.get("duration_ms", 0.0)
        record.user_agent = ctx.get("user_agent", "-")
        record.error_code = ctx.get("error_code", "-")

        if self.use_json:
            log_data = {
                "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "request_id": record.request_id,
                "module": record.module,
                "message": record.getMessage(),
                "duration": duration_val,
                "duration_ms": record.duration_ms if record.duration_ms > 0 else (duration_val * 1000 if duration_val else 0.0),
                "method": record.method if record.method != "-" else None,
                "path": record.path if record.path != "-" else None,
                "client_ip": record.client_ip if record.client_ip != "-" else None,
                "user_id": record.user_id if record.user_id != "-" else None,
                "user_agent": record.user_agent if record.user_agent != "-" else None,
                "error_code": record.error_code if record.error_code != "-" else None,
            }
            # Include traceback details if exception info is present
            if record.exc_info:
                log_data["exception"] = self.formatException(record.exc_info)
            return json.dumps(log_data, ensure_ascii=False)

        return super().format(record)

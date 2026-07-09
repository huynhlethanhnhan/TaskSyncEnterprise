# 📂 FILE: app/core/request_context.py
import contextvars
from typing import Any, Dict

# The context variable to hold the entire request context dict
_request_context: contextvars.ContextVar[Dict[str, Any]] = contextvars.ContextVar("request_context", default={})

# The backward compatible request_id ContextVar for logger/exceptions correlation
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

def get_request_context() -> Dict[str, Any]:
    """Retrieves the request context dictionary for the current request scope."""
    return _request_context.get()

def set_request_context(context: Dict[str, Any]) -> contextvars.Token:
    """Sets the request context dictionary for the current request scope."""
    return _request_context.set(context)

def reset_request_context(token: contextvars.Token) -> None:
    """Resets the request context dictionary for the current request scope."""
    _request_context.reset(token)

def get_request_id() -> str:
    """Retrieves only the request_id string from context."""
    return request_id_ctx.get()

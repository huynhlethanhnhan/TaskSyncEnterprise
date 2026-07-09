# Phase 3.1: Backend Foundation (P3-INF-001)

## Overview
This document explains the architecture of the TaskSyncEnterprise backend, built on top of **FastAPI** and **ASGI**. It addresses the structure, routing conventions, dynamic mounting, and validation check flows that make the server scalable, robust, and clean.

---

## Learning Objectives
By the end of this guide, you will be able to:
1. Define ASGI and contrast it with WSGI.
2. Explain the FastAPI request lifecycle and router patterns.
3. Understand the role of dynamic routing registration.
4. Set up static folder mounting for uploaded media files.

---

## Concepts Explained

### 1. ASGI (Asynchronous Server Gateway Interface)
WSGI (Web Server Gateway Interface) has long been the standard for Python web frameworks. However, WSGI is synchronous: it handles requests sequentially. 
ASGI is the spiritual successor to WSGI. It supports async/await concurrency, WebSockets, and long-lived connections (HTTP/2). This allows Python servers to handle millions of simultaneous queries efficiently.

### 2. FastAPI Routers
FastAPI uses `APIRouter` to break down endpoints into separate domain modules (e.g., Auth, Tasks, Employees). Routers keep the code modular and isolated, allowing developers to work on features without modifying a single massive `main.py` entrypoint.

---

## Why this Architecture was Chosen
- **Non-blocking Concurrency**: FastAPI leverages async event loops, matching Node.js performance while retaining Python's rich library ecosystem.
- **Auto-generated Documentation**: By declaring Pydantic schemas, FastAPI automatically renders Swagger UI and ReDoc pages.
- **Dynamic Routing Registration**: Automatically loops through domain routers to mount them, reducing human error when adding new modules.

---

## Project Implementation
In `backend/app/main.py`, routers are listed and mounted dynamically under the version prefix:

```python
from app.routers.v1 import (
    health,
    roles,
    departments,
    # ... other routers
)

routers = [
    health.router,
    roles.router,
    # ... list
]

for r in routers:
    app.include_router(r, prefix=settings.API_V1_STR)
```

---

## Real-world Examples
In a microservices architecture, a single gateway or app mounts distinct endpoints. Using FastAPI's sub-routers, teams can develop the `tasks` service and the `auth` service in isolated repositories, then mount them at the root application cleanly.

---

## Best Practices
- **Use Namespace Prefixes**: Group related endpoints under prefixes (e.g., `/api/v1/auth`).
- **Leverage Tags**: Use FastAPI tags to organize endpoints in the auto-generated Swagger documentation.
- **Isolate Routers**: Keep business logic in services; routers should only map HTTP requests and validate schemas.

---

## Common Mistakes
- **Mixing Sync and Async**: Running blocking I/O (like long-running calculations or non-async network requests) inside `async def` endpoints, which blocks the entire server. Use standard `def` for synchronous tasks, and `async def` for non-blocking asynchronous routines.

---

## Interview Questions
1. **What is the difference between ASGI and WSGI?**
   *Answer*: WSGI is synchronous and designed for standard thread-per-request HTTP. ASGI is asynchronous and supports asyncio event loops, WebSockets, and background tasks.
2. **How does FastAPI generate Swagger UI?**
   *Answer*: FastAPI uses OpenAPI schemas computed from Pydantic types and endpoint definitions to generate interactive Swagger UI documentation dynamically.

---

## References
- [Official FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ASGI Specification](https://asgi.readthedocs.io/en/latest/)

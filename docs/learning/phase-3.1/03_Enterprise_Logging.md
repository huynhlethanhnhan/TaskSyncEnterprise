# Phase 3.1: Enterprise Logging & Exception Handling (P3-INF-003)

## Overview
This document explains the enterprise logging and exception handling architecture of the TaskSyncEnterprise backend. It details how log streams are configured, how request correlation IDs trace transactions across microservices, and how global exception filters prevent database data leakages.

---

## Learning Objectives
By the end of this guide, you will be able to:
1. Explain the difference between file and console loggers.
2. Implement request correlation IDs using Python `contextvars`.
3. Set up rotating log handlers to manage server disk consumption.
4. Cleanly handle exceptions and sanitize error responses.

---

## Concepts Explained

### 1. Request Correlation IDs (Request ID)
In production environments handling thousands of concurrent requests, logs become scrambled. If five users hit `/login` simultaneously, standard logs print mixed records. 
A Correlation ID is a unique string (UUID) assigned to a request on entry. Every log statement produced during that request lifecycle prints this ID, allowing developers to filter logs for a specific transaction.

### 2. ContextVars
In concurrent programming, standard variables are shared, which can lead to data races. `contextvars` provide thread-safe, request-scoped storage. By setting a Correlation ID inside `contextvars`, each ASGI event loop execution preserves its own request ID safely.

### 3. Log Rotation
Without rotation limits, logging files will grow indefinitely and eventually consume all disk space, crashing the server. Log rotation limits file size (e.g. 10MB) and rolls over logs, keeping only a fixed number of backup files (e.g., 5).

---

## Why this Architecture was Chosen
- **Observability Isolation**: Separates runtime operations (`app.log`), warnings/errors (`error.log`), and security/compliance transactions (`audit.log`).
- **Security-First Errors**: Catches database errors and strips out internal table schemas or columns before sending responses to clients.
- **Traceability**: Incorporates dynamic Request IDs into response headers (`X-Request-ID`), allowing users to share trace keys with support teams.

---

## Project Implementation
In `backend/app/core/logger.py`, a `CorrelationIdFilter` binds context variables to logger records:

```python
import contextvars
import logging

request_id_ctx = contextvars.ContextVar("request_id", default="-")

class CorrelationIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True
```

In `backend/app/core/errors.py`, database exceptions are caught and sanitized:

```python
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    request_id = request_id_ctx.get()
    error_logger.error(f"Database failure: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Đã xảy ra lỗi tương tác cơ sở dữ liệu hệ thống.",
            "request_id": request_id,
            "data": None
        }
    )
```

---

## Real-world Examples
When diagnosing a failed payment transaction in production, an SRE queries the log aggregator (like ElasticSearch or Splunk) with the correlation ID returned in the client's API response. This displays every step, database query, and system event related to that specific checkout flow.

---

## Best Practices
- **Log Request Latency**: Timing requests helps identify bottlenecks.
- **Sanitize Exception Outputs**: Avoid leaking stack traces to frontend clients.
- **Use Log Levels**: Restrict console outputs to `INFO` or `WARNING` in production to minimize I/O overhead.

---

## Common Mistakes
- **Leaking Secrets in Logs**: Logging plain-text headers or query parameters containing sensitive tokens.
- **Neglecting Disk Space**: Forgetting log rotation parameters, causing disks to fill up.

---

## Interview Questions
1. **How do Python's `contextvars` work in an asynchronous server?**
   *Answer*: `contextvars` allow async tasks to maintain individual context states. As the event loop switches tasks, the execution context is automatically swapped, preventing data leaks across concurrent requests.
2. **Why should database exceptions be sanitized?**
   *Answer*: Raw database exceptions often reveal database engine types, table names, primary keys, and query logic. Compromised systems can leverage this structural information to perform SQL injections.

---

## References
- [Python contextvars Library](https://docs.python.org/3/library/contextvars.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Vocabulary_Cheat_Sheet.html)

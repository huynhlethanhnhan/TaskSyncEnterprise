# TaskSyncEnterprise V2 Backend Glossary

This glossary explains key backend, security, and operations concepts in simple language suitable for developers and students.

---

### Middleware
Software that runs in the background of every request-response cycle. Middlewares intercept incoming requests before they reach API routers, and process outgoing responses before they are returned to clients. Examples include CORS, logging, and security headers injection.

### Dependency Injection (DI)
A design pattern where an object receives its dependencies from an external source rather than creating them itself. In FastAPI, dependencies are injected using the `Depends()` keyword (e.g. injecting database sessions into router functions).

### Configuration
Setting parameters that dictate application behavior without modifying the code. Configuration parameters (like database credentials, token life, log levels) are loaded from environment variables or `.env` files.

### Health Check
An endpoint or service that queries application dependencies to report operational status. Used by monitoring tools to check if the application is online and functioning.

### Liveness
A monitoring probe that checks if the application container process is alive. If the liveness check fails, the orchestration platform (like Kubernetes) restarts the container.

### Readiness
A monitoring probe that checks if the application is ready to accept user requests. If readiness checks fail (e.g., due to database connectivity issues), the load balancer stops routing traffic to the container.

### Structured Logging
Formatting log records in structured formats (like JSON) rather than simple text strings. This allows log aggregators to query and filter log parameters efficiently.

### Correlation ID (Request ID)
A unique string (like a UUID) generated for each incoming HTTP request. This ID is attached to every log record generated during the request's lifecycle, allowing developers to trace transactions.

### ContextVar
A thread-safe, request-scoped context variable. It allows asynchronous tasks to manage individual states (like Correlation IDs) without data leaks across concurrent requests.

### Startup Event / validate_startup
Routines executed during application initialization to check dependencies (database, storage, configurations) before starting the server.

### Graceful Shutdown
A process shutdown sequence where the server stops accepting new requests, finishes outstanding tasks, disposes of resource pools (like database connections), and flushes log buffers before exiting.

### Security Headers
HTTP response headers that instruct browsers to enforce security controls, protecting clients against attacks like clickjacking and cross-site scripting (XSS).

### Trusted Host
A security validation that verifies incoming HTTP request `Host` headers against a list of allowed hostnames, defending against Host Header Injection attacks.

### Exception Handler
A centralized routine that catches raised exceptions and returns structured, user-friendly JSON responses while preventing raw system errors from leaking.

### Repository Pattern
A design pattern that abstracts data access logic, separating database operations from business logic.

### Service Layer
A layer of the application that encapsulates business rules and domain logic, separating API routers from data access models.

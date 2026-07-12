# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.9.0] - 2026-07-11

### Added
* **Multi-Stage Docker Packaging**: Production-grade multi-stage Dockerfile and docker-compose.yml to containerize the FastAPI app, Redis, and SQL Server.
* **Requirements Consolidation**: Consolidated python dependencies by declaring missing python-jose requirements.

### Hardened
* **Structured Logging**: Hardened application logs by replacing all raw print statements with structured app_logger telemetries.
* **Logout Endpoint Auth**: Secured the logout route by validating access tokens before blacklisting.

## [3.6.0] - 2026-07-11

### Added
* **API Versioning validation middleware**: Prevents requests to unsupported api versions (e.g. `/api/v9/`) by returning structured 404 responses.
* **Enterprise Idempotency middleware**: Supports `Idempotency-Key` headers on mutative requests (`POST`, `PUT`, `PATCH`) with atomic lock acquisition, response caching in Redis, and concurrency collision safety.
* **API Deprecation framework**: Reusable `@deprecate_endpoint` decorator and `APIDeprecationMiddleware` automatically injecting `Deprecation`, `Sunset`, and `Link` headers into HTTP responses.
* **Redis sliding window Rate Limiter**: High-performance middleware using Redis ZSET logs to enforce rolling request limit quotas on API paths per user/IP.

## [3.4.0] - 2026-07-11

### Added
* **Multiple Channel Notification delivery (Strategy Pattern)**: Refactored delivery logic to isolate channels (`EMAIL`, `IN_APP`, `WEBSOCKET`, `PUSH`, `SYSTEM`) using Strategy Pattern strategies with zero dispatcher if/else branches.
* **Enterprise WebSocket Notifications Gateway**: Real-time push server mounted at root `/ws/notifications`. Supports JWT authentication, query-string validation, private multi-tab recipient queues, heartbeat, and disconnect cleans.
* **Background Email Retry Poller**: Database-backed daemon poller thread retrying failed emails up to a threshold of 5 attempts.

## [3.3.0] - 2026-07-10

### Added
*   **Enterprise Response Framework**: Uniform envelopes (`ApiResponse[T]`, `PagedResponse[T]`) encapsulating all success and pagination structures with correlation IDs.
*   **Enterprise Global Exception Framework**: Centralized `unified_exception_handler` middleware translating HTTP, validation, database, and system errors into standard error payloads while masking sensitive schema data.
*   **Enterprise Logging Middleware**: Custom correlation context tracking request lifecycles and stamping Rotating File logs with `X-Request-ID`.
*   **Enterprise Query Engine & Search Engine**: Reusable SQLAlchemy pipelines automating dynamic filtering, column sorting, pagination, and case-insensitive, multi-column search rules.
*   **Enterprise Dashboard Analytics**: High-performance API aggregating multi-table widget counters in a single database round-trip using SQL scalar subqueries.
*   **Enterprise Background Job Framework**: Extensible asynchronous worker execution facade implementing FastAPI BackgroundTasks and local `ThreadPoolExecutor` fallback.
*   **Enterprise Notification Center**: Reusable in-app notification module with unread counts and read-state management integrated with the background job framework.
*   **Integration Tests**: Comprehensive E2E test suites in `tests/test_background_jobs.py`, `tests/test_dashboard.py`, and `tests/test_notifications.py` verifying full infrastructure integration.

### Fixed
*   **SQLite Dialect Compatibility**: Dynamically checks database engine names (`db.bind.dialect.name`) to fallback from MS SQL Server `sysutcdatetime()` to timezone-aware UTC datetime values in test environments, resolving local test failures.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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

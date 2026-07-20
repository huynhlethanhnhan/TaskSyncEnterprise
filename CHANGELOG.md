# Changelog

All notable changes to TaskSyncEnterprise are documented in this file.

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0-rc1] — 2026-07-20

### Added — Phase 3.8.8: Final Release Preparation
- Release pipeline with semantic version tag validation (`release.yml`).
- Docker Compose syntax validation in CI for all 3 compose files.
- Final production audit report (`docs/reports/final/FINAL_PRODUCTION_AUDIT.md`).
- Formal release candidate certification (`docs/releases/RELEASE_CANDIDATE_RC1.md`).
- Root-level `CHANGELOG.md` and `RELEASE_NOTES.md`.
- Version badge in README.

### Added — Phase 3.8.7: Backup, Restore & Disaster Recovery
- SQL Server full and differential backup automation.
- User uploads archive (tar.gz) with atomic staging restore.
- Redis RDB snapshot backup and guarded restore.
- JSON Schema–validated manifest generation.
- SHA-256 checksum generation and verification.
- Production overwrite dual controls (flag + environment variable).
- Path traversal, archive bomb, and secret leakage protections.
- 61 automated tests across 4 test suites.

### Added — Phase 3.8.6: Nginx, Reverse Proxy & HTTPS Preparation
- Nginx as single entry point (ports 80/443).
- Backend and frontend ports hidden from host.
- SPA routing with `try_files` fallback.
- API reverse proxy (`/api/v1` → backend).
- Swagger UI passthrough (`/docs`, `/openapi.json`).
- Static asset caching and gzip compression.
- Security-focused access log format (excludes Auth/Cookie headers).
- SSL/HTTPS stub ready for certificate mounting.

### Added — Phase 3.8.5: Environment & Secret Runtime Hardening
- Required secret enforcement with Docker Compose `?` syntax.
- `SecretStr` usage for sensitive Pydantic settings.
- `.env.production.example` template with documentation.
- Startup validation rejecting weak/default secrets in production.

### Added — Phase 3.8.4: Production Docker Compose
- Multi-service production orchestration with 8 containers.
- Three-tier network isolation (frontend, backend internal, monitoring).
- Resource limits and reservations for all services.
- Health checks for all application and infrastructure services.
- Named volumes for persistent data.

### Added — Phase 3.8.3: Production Docker Image Hardening
- Multi-stage Dockerfile (builder + runner).
- Non-root user with explicit UID/GID (10001).
- Read-only filesystem with tmpfs for temp data.
- `no-new-privileges` and `cap_drop: ALL` enforcement.
- Hadolint integration in CI.

### Added — Phase 3.8.2: GitHub Actions CI & Security Scan
- Ruff linting, Black formatting checks.
- Pytest with coverage report upload.
- Bandit SAST and pip-audit SCA scanning.
- Docker image build validation.
- Concurrency groups with cancel-in-progress.

### Added — Phase 3.8.1: Docker Packaging
- Initial multi-stage Docker build.
- Development Docker Compose with SQL Server and Redis.

### Added — Phase 3.7: Monitoring, Health & Observability
- Prometheus `v3.13.1` metrics collection with auto-scrape.
- Grafana `11.1.0` dashboards with provisioned datasources.
- cAdvisor container resource monitoring.
- OpenTelemetry auto-instrumentation (FastAPI, SQLAlchemy, Redis).
- Custom `PrometheusMetricsMiddleware` at `/metrics`.
- Structured JSON logging with request context and correlation IDs.
- SRE health endpoints (`/health/live`, `/health/ready`, `/health/details`).

### Added — Phase 3.6: Production Readiness
- Startup bootstrap validations.
- Graceful shutdown with lifecycle hooks.
- Background email retry poller.

### Added — Phase 3.5: Performance Optimization
- Redis caching layer with invalidation strategies.
- Rate limiting middleware with Redis backend.
- Idempotency middleware for safe request retries.
- Cache manager with TTL and pattern-based invalidation.

### Added — Phase 3.4: Notification & Email
- WebSocket real-time notification system.
- Email service with retry mechanism.
- Notification repository and engine.
- Email HTML template rendering.

### Added — Phase 3.3: Backend Completion
- Full CRUD operations for all entities.
- Dashboard analytics API.
- API deprecation middleware.
- API versioning middleware.
- Centralized error codes and exception handlers.

### Added — Phase 3.2: Authentication & Authorization
- JWT access and refresh token authentication.
- Role-based access control (RBAC).
- Password hashing with bcrypt.
- Client credential validation.

### Added — Phase 3.1: Production Hardening
- TrustedHostMiddleware for Host header protection.
- SecurityHeadersMiddleware (OWASP-aligned).
- CORS configuration with strict origins.
- Structured logging middleware.
- Request context propagation.

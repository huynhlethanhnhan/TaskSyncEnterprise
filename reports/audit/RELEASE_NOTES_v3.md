# Release Notes - Version 3.0.0 (Milestone M3)

This release marks the completion of the Phase 3 backend infrastructure, establishing robust API governance, authenticated WebSocket notifications, and containerized deployment packages.

---

## 🚀 Key Features

### 1. API Governance Foundation (Phase 3.6)
* **Versioning**: Enforces path prefix validation (e.g. `/api/v1`) and rejects unsupported segments with clean 404 wrappers.
* **Idempotency**: Implements safe mutation request cache locking via `Idempotency-Key` headers and Redis SET NX states.
* **Rate Limiting**: Rolling sliding window log rate limiting using Redis ZSET logs.
* **Deprecation Decorators**: Automatic response header injection (`Deprecation`, `Sunset`, `Link`) on sunset routes.

### 2. Notification Infrastructure (Phase 3.4)
* **Strategy Pattern Delivery**: Decouples business logic from delivery strategies (SMTP Email, DB In-App, WebSockets, Mobile Push, System Logs).
* **WebSocket push server**: Root-level authenticated websocket gateway `/ws/notifications` supporting multi-tab active client connections, heartbeats, and cleanup triggers.
* **Email Reliability Poller**: Daemon retry scheduler scanning database logs and resending failed emails up to 5 times.

### 3. Containerization
* Secure multi-stage `Dockerfile` minimizing final image size.
* Complete `docker-compose.yml` for multi-service execution.

---

## 🛠️ Security & Quality Hardening
* Hardened `/auth/logout` endpoint against unauthenticated client bloat.
* Replaced all 9 raw print statements with structured `app_logger` telemetry calls.
* Consolidated `requirements.txt` declaring missing `python-jose` dependencies.

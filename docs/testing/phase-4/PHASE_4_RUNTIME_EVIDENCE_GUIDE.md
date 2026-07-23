# Runtime Evidence Capture Guide — TaskSyncEnterprise Phase 4

**Document Path:** `docs/testing/PHASE_4_RUNTIME_EVIDENCE_GUIDE.md`  
**Date:** 2026-07-22  
**Status:** Phase 4.8 partially executed; see `docs/reports/PHASE_4_8_RUNTIME_VERIFICATION_REPORT.md`  

---

## 📌 Executive Overview

This document specifies the exact instructions, directory structures, parameters, and commands required to capture, store, and validate operational runtime evidence for TaskSyncEnterprise Phase 4.

All evidence files must be saved under repository-relative paths within `docs/evidence/phase-4/`.

> ⚠️ **SECURITY MANDATE:** Never place credentials, JWT secret tokens, database passwords, or private production keys inside evidence logs or JSON artifacts. Sanitization is mandatory prior to committing.

---

## 📁 Repository-Relative Evidence Directory Taxonomy

```text
docs/evidence/phase-4/
├── chrome/             # Chrome E2E execution screenshots & computed layout JSONs
├── edge/               # Microsoft Edge (msedge.exe) execution screenshots & layout JSONs
├── firefox/            # Firefox execution screenshots & computed layout JSONs
├── responsive/         # Screenshots & overflow matrices across all 8 viewports
├── avatar/             # Upload, preview, deletion & container restart persistence proof
├── leave/              # Role-based leave submission, timeline & approval state proofs
├── notifications/      # WebSocket connection logs, latency benchmarks & badge proofs
├── docker/             # Docker container health, compose ps, and liveness probe logs
└── alembic/            # Migration current/heads status and seed execution logs
```

---

## ⚙️ Step-by-Step Evidence Capture Procedures

### 1. Docker Container Health & Infrastructure Evidence (`docker/`)
Capture current container status, published ports, container health check probes, and Nginx gateway liveness logs:

```powershell
# 1. Capture Compose PS output
docker compose --env-file .env.production -f docker-compose.production.yml ps > docs/evidence/phase-4/docker/ps_output.txt

# 2. Capture Container Health Details
docker inspect --format='{{json .State.Health}}' tasksync-backend-prod > docs/evidence/phase-4/docker/backend_health.json
docker inspect --format='{{json .State.Health}}' tasksync-sqlserver-prod > docs/evidence/phase-4/docker/sqlserver_health.json

# 3. Capture Nginx Liveness Probe Response
curl -s -i http://localhost/healthz > docs/evidence/phase-4/docker/healthz_response.txt
```

### 2. Database Schema & Alembic Migration Evidence (`alembic/`)
Verify that SQL Server schema matches Alembic migration heads without schema drift:

```powershell
# 1. Capture Alembic Current Revision
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint alembic backend current > docs/evidence/phase-4/alembic/current.txt

# 2. Capture Alembic Migration Heads
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint alembic backend heads > docs/evidence/phase-4/alembic/heads.txt

# 3. Capture Seed Data Output Summary
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint python backend Seed_Example.py > docs/evidence/phase-4/alembic/seed_output.txt
```

### 3. Cross-Browser Automated E2E Evidence Capture (`chrome/`, `edge/`, `firefox/`)
Run Playwright browser suites to capture rendering parity, computed typography, scrollbars, and network/console logs:

```powershell
cd frontend

# Execute Chrome E2E Evidence Harness
npm run test:e2e:chrome

# Execute Microsoft Edge E2E Evidence Harness
npm run test:e2e:edge

# Execute Firefox E2E Evidence Harness (uses Playwright Firefox unless FIREFOX_PATH overrides it)
npm run test:e2e:firefox
```

The harness script (`e2e-browser-audit.mjs`) automatically generates:
- Screenshot files: `docs/evidence/phase-4/{browser}/{page_name}_{viewport}.png`
- Layout JSON rows: `docs/evidence/phase-4/{browser}/layout_matrix.json`

### 4. Responsive Viewport Matrix Evidence (`responsive/`)
Verify responsive layout integrity across all 8 mandatory viewports (1920x1080, 1584x900, 1440x900, 1366x768, 1024x768, 768x1024, 390x844, 375x667):

```powershell
cd frontend
npm run test:e2e:responsive
```

Output files are stored as `docs/evidence/phase-4/responsive/{page}_{width}x{height}.png`, with the matrix in `viewport_matrix.json`.

### 5. Avatar Lifecycle & Container Restart Persistence Evidence (`avatar/`)
Verify persistent upload, MIME validation, thumbnail rendering, and survival across backend container restarts:

```powershell
# 1. Upload Avatar via Profile UI and verify storage
# File created in persistent volume: backend_uploads -> /app/uploads/avatars/UUID.ext

# 2. Restart Backend Container
docker compose --env-file .env.production -f docker-compose.production.yml restart backend

# 3. Verify Avatar Availability Post-Restart
curl -s -I http://localhost/uploads/avatars/<AVATAR_FILENAME> > docs/evidence/phase-4/avatar/restart_persistence_check.txt
```

### 6. Realtime WebSocket Notification Latency Evidence (`notifications/`)
Verify WebSocket arrival latency (< 2000ms) across dual browser sessions (Admin sender vs Employee receiver):

```powershell
cd frontend
npm run test:e2e:notifications
```

Output log written to: `docs/evidence/phase-4/notifications/latency_benchmark.json`

---

## 📑 Evidence Verification Checklist

- [x] Directory structure `docs/evidence/phase-4/` created.
- [x] All file paths are repository-relative.
- [x] Credentials and secrets sanitized from all logs.
- [x] Screenshot resolutions match specified viewports.
- [x] Network error logs and console error arrays captured.

Run `npm run test:e2e:evidence` after capture. This checklist only validates artifacts that actually exist; absent avatar, leave, RBAC, or restart evidence must remain Not Executed rather than Pass.

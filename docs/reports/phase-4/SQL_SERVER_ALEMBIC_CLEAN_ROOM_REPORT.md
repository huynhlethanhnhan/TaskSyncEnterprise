# TaskSyncEnterprise — SQL Server Host & Alembic Clean-Room Repair Report

**Date of Execution:** 2026-07-23 (Asia/Saigon)  
**Target Branch:** `develop`  
**Repository Working Tree:** `Clean` (`nothing to commit, working tree clean`)  
**Latest Certified Commit SHA:** `2db76454d6bf0ff4eb04c7ebbb43779e56caeaef`  
**Clean-Room Target Directory:** `E:\TaskSyncEnterprise-CleanRoom`  
**Clean-Room Target SHA:** `a54a8faf8c9148887c5b04da16020e5fa3476283`  
**Final Validation Verdict:** **Passed**

---

## 🎯 1. Root Cause Analysis

During initial repository audits, the default configuration in `backend/app/core/settings.py` hardcoded the developer's personal machine hostname (`JINDOU_ITSUKI`) as the fallback value for `MSSQL_HOST`.

If a developer cloned the repository on a different machine without providing explicit environment overrides, the backend application and Alembic migration engine attempted to connect to `JINDOU_ITSUKI`, resulting in database connection timeouts and unresolved hostname errors on non-local computers.

---

## 🔍 2. Audit Table of Legacies & Remediation Findings

| File | Line | Current Value | Environment | Valid? | Replacement Value |
|---|---|---|---|---|---|
| `backend/app/core/settings.py` | 137 | `default="JINDOU_ITSUKI"` | App Config Default | `Invalid (Machine-specific)` | `default="127.0.0.1"` |
| `backend/app/core/settings.py` | 231 | `if self.MSSQL_HOST == "JINDOU_ITSUKI"` | Loopback Check | `Invalid (Machine-specific)` | `if self.MSSQL_HOST in ("localhost", "127.0.0.1")` |
| `docker-compose.yml` | 13 | `- DATABASE_URL=${DATABASE_URL:-...}` | Docker Dev Stack | `Invalid (Raw unencoded DB URL)` | `MSSQL_HOST=${MSSQL_HOST:-sqlserver}`, `MSSQL_USER`, `MSSQL_PASSWORD` |
| `docker-compose.production.yml` | 75 | `- DATABASE_URL=mssql+pymssql://sa:${MSSQL_SA_PASSWORD}@...` | Docker Prod Stack | `Invalid (Unencoded @ in password)` | `MSSQL_HOST=sqlserver`, `MSSQL_USER=sa`, `MSSQL_PASSWORD=${MSSQL_SA_PASSWORD}` |
| `.env.example` | 11 | `DATABASE_URL=mssql+pymssql://sa:...@sqlserver:1433...` | Local Dev Template | `Invalid (Mixed Docker host)` | `MSSQL_HOST=127.0.0.1` (individual vars) |
| `.env.production.example` | 28 | `MSSQL_SA_PASSWORD=CHANGE_ME_StrongPassword123!` | Prod Template | `Valid` | Safe non-secret placeholder |
| `backend/alembic/env.py` | 40 | `url = config.get_main_option("sqlalchemy.url")` | Alembic Offline Mode | `Unified` | `url = settings.SQLALCHEMY_DATABASE_URI` |
| `README.md` | 46, 110 | Local vs Docker database hosts | Documentation | `Updated` | Mode A (`127.0.0.1`) vs Mode B (`sqlserver`) |

---

## 🏗️ 3. Multi-Environment Database Architecture

### A. Local Development Environment
- **Host Engine:** FastAPI runs directly on Windows/Linux host machine.
- **SQL Server Connection:** `MSSQL_HOST=127.0.0.1` or `localhost` (or `localhost\SQLEXPRESS`).
- **Connection Builder:** `settings.SQLALCHEMY_DATABASE_URI` dynamically constructs the connection string and uses `urllib.parse.quote_plus` to safely URL-encode passwords containing special characters (such as `@` or `#`).

### B. Docker Compose Production Environment
- **Host Engine:** Backend runs inside `tasksync-backend-prod` container.
- **SQL Server Connection:** `MSSQL_HOST=sqlserver` (Docker DNS service resolution).
- **Network Isolation:** Backend connects across isolated Docker network `tasksync-net`. `127.0.0.1` inside container correctly resolves to backend loopback, NOT SQL Server.

### C. GitHub Actions CI Environment
- **Host Engine:** Pytest runner executes within GitHub Actions runner container.
- **Database Engine:** Isolated SQLite test database harness (`tests/conftest.py`) initializes `sqlite:///./test.db` with schema normalization.
- **Isolation Guarantee:** CI test runner never reads local `.env` or attempts to connect to local SQL Server hostnames.

---

## 🔄 4. Alembic Connection & Migration Flow

1. **Unified Configuration:** `backend/alembic/env.py` imports `app.config.settings` for both online and offline migration modes.
2. **Dynamic URL Resolution:** `env.py` reads `settings.SQLALCHEMY_DATABASE_URI` at runtime, ensuring Alembic uses the exact same database target and password URL-encoding logic as the main FastAPI application.
3. **Container Alembic Execution:**
   - `docker exec tasksync-backend-prod alembic heads` -> `7b31f6e4c2a0 (head)`
   - `docker exec tasksync-backend-prod alembic current` -> `7b31f6e4c2a0 (head)`
   - `docker exec tasksync-backend-prod alembic upgrade head` -> `Context impl MSSQLImpl. Will assume transactional DDL.`

---

## 🧪 5. Verification & Clean-Room Clone Audit Results

### Local Pytest & Quality Gates
- **Pytest:** `288 passed in 38.30s` (0 failures, 0 tracebacks, 0 skipped/xfail additions).
- **Black Check:** `196 files would be left unchanged` (100% format compliant).
- **Ruff Linter:** `All checks passed!`.

### Remote GitHub Actions CI
- **Backend CI (Python 3.12):** `completed` | **`success`**
- **Frontend CI (Node 22):** `completed` | **`success`**
- **Docker Validation:** `completed` | **`success`**

### Clean-Room Clone (`E:\TaskSyncEnterprise-CleanRoom`)
- **Docker State Purge:** Removed all old TaskSync containers, networks, and named volumes.
- **Fresh Build:** Built all 5 container images with `--no-cache` from zero.
- **Fresh DB Initialization:** Created `TaskSyncEnterprise` DB on fresh SQL Server 2022 container.
- **Alembic Migration:** `alembic upgrade head` executed to revision `7b31f6e4c2a0`.
- **Seed Execution:** `Seed_Example.py` populated initial 12 employee records.
- **Container Health:** All 5 services (`nginx`, `backend`, `redis`, `sqlserver`, `frontend`) achieved **`healthy` / `Up`**.
- **Persistence Verification:** Verified data survival across stack restart and full `down` -> `up -d` cycle.

---

## 🏁 6. Final Certification Verdict

- **Legacy Hostname Status:** `0` references to `JINDOU_ITSUKI` remaining in tracked repository.
- **Alembic Unification:** Fully unified with runtime `settings.SQLALCHEMY_DATABASE_URI`.
- **Docker Environment:** Backend container uses `MSSQL_HOST=sqlserver`.
- **Clean-Room Validation Status:** **Clean-Room Validation Passed**
- **GitHub Actions Status:** **`GitHub Actions Green`**
- **Final Verdict:** **Passed**

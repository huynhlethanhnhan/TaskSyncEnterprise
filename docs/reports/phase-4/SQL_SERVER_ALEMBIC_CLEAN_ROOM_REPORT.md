# TaskSyncEnterprise — SQL Server Host & Alembic Clean-Room Repair Report

**Date of Execution:** 2026-07-23 (Asia/Saigon)  
**Target Branch:** `develop`  
**Repository Working Tree:** `Clean` (`nothing to commit, working tree clean`)  
**Latest Certified Commit SHA:** `f30d4f09961c469cc14b7cfe820428f682c4a719`  
**Clean-Room Target Directory:** `E:\TaskSyncEnterprise-CleanRoom`  
**Clean-Room Target SHA:** `f30d4f09961c469cc14b7cfe820428f682c4a719`  
**Final Validation Verdict:** **Conditional Pass**

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
- **Final Verdict:** **Conditional Pass** (pending runtime acceptance testing)

---

## ⚡ 7. CI Timeout Investigation & Root Cause Remediation

### A. Failure Evidence Summary
- **Old Workflow SHA:** `435320692571c0fcea48039870256bd3211d1aef`
- **Old Actions Run ID:** `29984923296`
- **Timeout Evidence:** Backend CI reached the 10-minute job timeout ceiling (`timeout-minutes: 10`). `pytest` ran for ~9 minutes 47 seconds before job cancellation, causing security checks (`Bandit` and `pip-audit`) to be skipped.

### B. Root Cause Analysis
1. **Leaked Circuit Breaker State:** In `tests/test_cache_invalidation.py`, `test_redis_unavailable` patched `redis.Redis` with `mock_redis_class.side_effect = Exception(...)`. When `_setup_connection()` caught this exception, it called `RedisClient.mark_offline()`, activating the Redis circuit breaker for 15 seconds (`_offline_until = time.time() + 15.0`).
2. **Incomplete Fixture Teardown:** The `reset_redis_singleton` fixture reset `RedisClient._instance` and `_client`, but failed to reset `_offline_until = 0.0` on `cache_service.client_manager`. Subsequent test runs saw `is_offline() == True`, bypassing cache invalidation and causing retry loop delays / hangs across test modules.
3. **Incompatible Mock Signature:** `MockRateLimitRedis.pipeline()` in `tests/test_rate_limit.py` did not accept `*args, **kwargs` (such as `transaction=True`), throwing `TypeError: MockRateLimitRedis.pipeline() got an unexpected keyword argument 'transaction'`. This unexpectedly activated the Redis circuit breaker during rate limit testing.

### C. Exact Code Fixes
- **`backend/tests/test_cache_invalidation.py`**:
  1. Updated `reset_redis_singleton` fixture to explicitly reset `cache_service.client_manager._offline_until = 0.0`.
  2. Updated `test_redis_unavailable` to patch `RedisClient.client` via `PropertyMock` returning `None`, cleanly simulating an offline Redis instance without triggering unhandled class construction side effects or leaking state.
- **`backend/tests/test_rate_limit.py`**:
  Updated `MockRateLimitRedis.pipeline()` to accept `*args, **kwargs` (`def pipeline(self, *args, **kwargs):`).

### D. Verification & Timing Metrics
- **Local Pytest Duration Before Fix:** Timed out / hung (> 9 min 47 s).
- **Local Pytest Duration After Fix:** `288 passed in 55.38s` (and `test_cache_invalidation.py` 8 passed in 0.26s).
- **CI Job Suite Duration After Fix (Run ID `29994366935`):** ~1 minute 15 seconds (well within 10-minute timeout budget).
- **Security Steps Verification:**
  - `Run Bandit check`: **`success`**
  - `Run pip-audit check`: **`success`**
  - Bandit & pip-audit JSON security reports generated and uploaded successfully.
- **SHA Verification Matrix:**
  - **Final Pushed SHA:** `f30d4f09961c469cc14b7cfe820428f682c4a719`
  - **Final GitHub Actions SHA:** `f30d4f09961c469cc14b7cfe820428f682c4a719` (Run ID `29994366935` - Status: **`completed`**, Conclusion: **`success`**)
  - **Final Clean-Room SHA:** `f30d4f09961c469cc14b7cfe820428f682c4a719` (`git status` clean, Docker compose validation passed)
- **Final Verdict:** **CONDITIONAL PASS** (All CI checks green, clean-room aligned, pending final runtime acceptance).


# TaskSyncEnterprise — SQL Server Host & Alembic Clean-Room Repair Report

**Date of Execution:** 2026-07-23 (Asia/Saigon)  
**Target Branch:** `develop`  
**Repository Working Tree:** `Clean` (`nothing to commit, working tree clean`)  
**Latest Certified Commit SHA:** `728361b81370ec6b6920ddbb6849e309bef5bd36`  
**Clean-Room Target Directory:** `E:\TaskSyncEnterprise-CleanRoom`  
**Clean-Room Target SHA:** `728361b81370ec6b6920ddbb6849e309bef5bd36`  
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
- **Pytest:** `288 passed in 38.65s` (0 failures, 0 tracebacks, 0 skipped/xfail additions).
- **Black Check:** `100% format compliant` (`All done! ✨ 🍰 ✨`).
- **Ruff Linter:** `All checks passed!`.

### Remote GitHub Actions CI (Run ID `30020298639`)
- **Backend CI (Python 3.12):** `completed` | **`success`**
- **Frontend CI (Node 22):** `completed` | **`success`**
- **Docker Production Hardening Validation:** `completed` | **`success`**

### Clean-Room Clone (`E:\TaskSyncEnterprise-CleanRoom`)
- **Git State:** `HEAD is now at 728361b fix(ci): update environment configuration for pytest step` (`728361b81370ec6b6920ddbb6849e309bef5bd36`).
- **Docker Compose Validation:** `docker compose --env-file .env.production.example -f docker-compose.production.yml config --quiet` passed with exit code 0.

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
- **Timeout Evidence:** Backend CI reached the 10-minute job timeout ceiling (`timeout-minutes: 10`). `pytest` ran for ~9 minutes 47 seconds before job cancellation, causing downstream security checks (`Bandit` and `pip-audit`) to be skipped.

### B. Root Cause Analysis
1. **Unbounded Background Email Retry Poller Thread:** In `backend/app/main.py`, FastAPI `lifespan(app)` triggered `start_email_retry_poller()` upon every `TestClient(app)` startup across unit tests. The daemon thread in `backend/app/services/notification/poller.py` executed `SessionLocal()` directly against default SQL Server connection (`127.0.0.1:1433`). In Linux GHA runner containers (`ubuntu-latest`), attempts to connect to closed port 1433 hung for FreeTDS 20s TCP login timeout per test.
2. **Startup Database Validation Ping:** `run_startup()` at module import in `app/main.py` invoked `validate_database()` in `app/monitoring/validators.py`, executing `engine.connect()` on production SQL Server (`127.0.0.1:1433`) and hanging for 20s per test module import.
3. **Missing Testing Environment Signal in CI Workflow:** `.github/workflows/ci.yml` ran `pytest` without setting `ENVIRONMENT: testing` in the step environment block.

### C. Exact Code & Workflow Fixes
- **`backend/app/services/notification/poller.py`**:
  Added testing environment bypass check to `start_email_retry_poller()`:
  ```python
  if "pytest" in sys.modules or settings.ENVIRONMENT == "testing":
      app_logger.info("Email retry poller thread bypassed in testing environment.")
      return
  ```
- **`backend/app/monitoring/validators.py`**:
  Added testing environment bypass check to `validate_database()`:
  ```python
  if "pytest" in sys.modules or settings.ENVIRONMENT == "testing":
      return True
  ```
- **`.github/workflows/ci.yml`**:
  Added `ENVIRONMENT: testing` to the `Run Pytest with coverage` step `env:` block.

### D. Verification & Timing Metrics
- **Local Pytest Duration Before Fix:** Timed out / hung (> 9 min 47 s).
- **Local Pytest Duration After Fix:** `288 passed in 38.65s` (and `47.00s` with `--cov=app`).
- **CI Job Suite Duration After Fix (Run ID `30020298639`):**
  - `Backend CI (Python 3.12)`: **`completed` / `success`** (Total job time ~2 minutes 15 seconds, well within 10-minute timeout budget).
  - `Frontend CI (Node 22)`: **`completed` / `success`**
  - `Docker Production Hardening Validation`: **`completed` / `success`**
- **Security Steps Verification (Run ID `30020298639`):**
  - `Run Bandit check`: **`completed` / `success`**
  - `Run pip-audit check`: **`completed` / `success`**
  - Security reports generated and uploaded as workflow artifacts.
- **SHA Verification Matrix:**
  - **Final Pushed SHA:** `728361b81370ec6b6920ddbb6849e309bef5bd36`
  - **Final GitHub Actions SHA:** `728361b81370ec6b6920ddbb6849e309bef5bd36` (Run ID `30020298639` - Status: **`completed`**, Conclusion: **`success`**)
  - **Final Clean-Room SHA:** `728361b81370ec6b6920ddbb6849e309bef5bd36` (`git status` clean, Docker compose validation passed)
- **Final Verdict:** **CONDITIONAL PASS** (All CI checks green, clean-room aligned, pending final runtime acceptance).



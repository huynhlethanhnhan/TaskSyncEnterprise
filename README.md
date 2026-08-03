# TaskSyncEnterprise — Enterprise Task & Work Management Platform

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC1-blue.svg)](docs/reports/final_release_candidate_report.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-408%20Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![Frontend Vite](https://img.shields.io/badge/Vite%20Build-Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![Alembic Clean Database](https://img.shields.io/badge/Alembic%20Migrations-Verified%20Clean-success.svg)](docs/reports/ALEMBIC_MIGRATION_LOCAL_FIX_REPORT.md)
[![Docker Status](https://img.shields.io/badge/Docker%20Status-Not%20Verified%20E2E-amber.svg)](#14-docker-status)

---

## 1. Project Overview

**TaskSyncEnterprise** is a multi-tenant, role-based enterprise task management platform built for modern agile software development teams. The platform cleanly integrates **Administration Governance** (`Department -> Team -> Employee`) with **Agile Work Management** (`Project -> ProjectMember -> Sprint -> Task -> TaskAssignment -> Board -> Backlog -> Notifications -> Dashboard -> Calendar`).

---

## 2. Technology Stack

- **Backend Framework**: Python 3.12+, FastAPI, Uvicorn
- **ORM & Database**: SQLAlchemy 2.0, Alembic, MS SQL Server (via `pymssql`)
- **Frontend Framework**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query
- **Testing & Quality**: Pytest (408 tests passed), Compileall, Ruff
- **Database Engine**: Microsoft SQL Server 2022 / SQLEXPRESS

---

## 3. Prerequisites

Before installing TaskSyncEnterprise locally on Windows, ensure the following software is installed:
1. **Python 3.12+** (Added to PATH)
2. **Microsoft SQL Server** (MSSQLSERVER or SQLEXPRESS)
3. **Node.js v20+** and `npm`
4. **Git**

---

## 4. Local Setup on Windows

Clone the `develop` branch from GitHub into your local workspace directory (e.g. `D:\TaskSyncEnterprise` or `E:\TaskSyncEnterprise`):

```powershell
# Clone develop branch
git clone --branch develop --single-branch https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git TaskSyncEnterprise

# Navigate to repository root
cd TaskSyncEnterprise
```

---

## 5. Python Virtual Environment

Navigate to the `backend` directory, create and activate a Python virtual environment:

```powershell
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment on Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt
```

---

## 6. Environment Configuration

Copy `.env.example` to create your local `.env` file:

```powershell
# Copy template (Do NOT commit .env with real passwords/secrets)
Copy-Item ..\.env.example .env
```

Edit `.env` for your local SQL Server instance:

```env
MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=TaskSyncEnterprise
MSSQL_USER=
MSSQL_PASSWORD=
```

> [!NOTE]
> - `MSSQL_HOST=127.0.0.1` is generally more stable than `localhost` on Windows IPv4/IPv6 resolver setups.
> - Leave `MSSQL_USER` and `MSSQL_PASSWORD` empty if your local SQL Server uses Windows Trusted Authentication, or specify your `sa` / application credentials.

---

## 7. SQL Server Configuration

Ensure your local Microsoft SQL Server service is running and configured for TCP connections:
- Open **SQL Server Configuration Manager**.
- Enable **TCP/IP** protocol under *SQL Server Network Configuration*.
- Verify TCP Port is set to **1433**.
- Ensure the **SQL Server (MSSQLSERVER)** or **SQL Server (SQLEXPRESS)** service is running.

---

## 8. Create Database

Alembic manages table schemas and migration chains, but does not automatically create the SQL Server database container itself. The database must exist before executing migrations.

Create the `TaskSyncEnterprise` database using SQL Server Management Studio (SSMS), `sqlcmd`, or the provided idempotent SQL script:

### Using SQL Script:
```powershell
# SQL Script located at backend/scripts/create_database.sql
```

### SQL Command:
```sql
USE master;
GO

IF DB_ID(N'TaskSyncEnterprise') IS NULL
BEGIN
    CREATE DATABASE [TaskSyncEnterprise];
END;
GO
```

---

## 9. Run Alembic Migrations

For a brand new empty database, run `alembic upgrade head`. Alembic will automatically execute the entire migration chain from `<base>` to `head`:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Upgrade database to head (no need to run 'upgrade base' first)
python -m alembic upgrade head

# Verify migration status
python -m alembic current
python -m alembic heads
```

Verify that `alembic current` matches `alembic heads` (e.g. `05252bd1d012 (head)`).

---

## 10. Start Backend

Start the FastAPI application backend server:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Access the interactive API documentation:
- OpenAPI / Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Probe: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Liveness Probe: [http://127.0.0.1:8000/health/live](http://127.0.0.1:8000/health/live)
- Readiness Probe: [http://127.0.0.1:8000/health/ready](http://127.0.0.1:8000/health/ready)

---

## 11. Start Frontend

In a separate PowerShell terminal, navigate to `frontend` and start Vite dev server:

```powershell
cd frontend
npm install
npm run dev
```

Access the web application at [http://localhost:5173](http://localhost:5173).

---

## 12. Run Tests

Execute the backend quality gates and automated test suite:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Syntax & Compilation Check
python -m compileall app alembic

# Linting
ruff check .

# Automated Pytest Suite (408 tests)
python -m pytest -q

# Run Local Migration Verification Script
.\scripts\test_migrations_local.ps1
```

---

## 13. Migration Troubleshooting

If migration fails with SQL constraint errors on older database instances:
1. **Auto-generated Constraint Names (`FK__...`)**:
   All migration scripts (specifically `f69319655bb9`) now use dynamic metadata reflection (`find_foreign_key_name`) to discover foreign key names before dropping them. This ensures safe execution on any clean MSSQL instance regardless of SQL Server's random hash suffix generation.
2. **Resetting Test Database (Local Dev Only)**:
   ```sql
   USE master;
   GO
   IF DB_ID(N'TaskSyncEnterprise') IS NOT NULL
   BEGIN
       ALTER DATABASE [TaskSyncEnterprise] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
       DROP DATABASE [TaskSyncEnterprise];
   END;
   GO
   CREATE DATABASE [TaskSyncEnterprise];
   GO
   ```

---

## 14. Docker Status

> [!WARNING]
> **Docker Status: Not yet verified end-to-end.**
> The verified installation path for TaskSyncEnterprise is currently **Windows Local + Python Virtual Environment + MSSQL Local**.
> Docker Compose configurations are included for experimental container setups, but end-to-end container validation is scheduled for a future release cycle.

---

## 15. Security Notes

- **Secrets Management**: Never commit populated `.env` files or hardcoded credentials to Git.
- **Connection Security**: Ensure production SQL Server connections use encrypted channels (`Encrypt=True;TrustServerCertificate=False`).
- **User Permissions**: Never use `sa` account for production application connections. Create dedicated, least-privileged database users.

---

## 16. Git Branch Workflow

- **Development Branch**: `develop`
- **Rule**: All feature development, bug fixes, and migration updates must be pushed to `develop`.
- **Pre-commit Checklist**:
  1. Clean database `alembic upgrade head` PASS
  2. `alembic current` == `alembic heads` PASS
  3. `ruff check .` PASS
  4. `python -m pytest -q` PASS
  5. `git status` clean

---

## 📖 Key Documentation Links

- 📄 [Alembic Migration Fix Report](docs/reports/ALEMBIC_MIGRATION_LOCAL_FIX_REPORT.md)
- 🎯 [Final Release Candidate Report](docs/reports/final_release_candidate_report.md)
- 🏢 [Enterprise Business Relationships Architecture](docs/architecture/business_relationships.md)

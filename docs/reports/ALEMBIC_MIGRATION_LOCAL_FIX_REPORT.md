# Alembic Migration Fix & Local Clean Database Setup Report

**Date**: 2026-08-03  
**Repository Location**: `E:\TaskSyncEnterprise`  
**Target Branch**: `develop`  
**Author**: Senior Backend & Database Migration Engineer  

---

## 1. Executive Summary

This report documents the resolution of the Alembic migration failure on clean Microsoft SQL Server databases for the `TaskSyncEnterprise` project. Previously, attempting to run `alembic upgrade head` on a fresh, empty MSSQL database failed at revision `f69319655bb9_alter_notification_unicode` with SQL Server error `3728: 'FK__audit_log__emplo__59FA5E80' is not a constraint`.

The migration chain has been refactored to use **dynamic metadata inspection** instead of hardcoded auto-generated system constraint names (`FK__...`). The migration chain now passes clean-room tests on brand new, empty MSSQL databases from `<base>` to `head`.

---

## 2. Root Cause Analysis

### The Failure Mechanism
1. **Initial Migration (`f4e146c8eb61_init_db_v2_final.py`)**: Tables were created with inline `sa.ForeignKeyConstraint(['employee_id'], ['dbo.employees.id'])` without explicit constraint names. When executed against SQL Server, SQL Server auto-generated foreign key constraint names with random hex suffixes (e.g. `FK__audit_log__emplo__59FA5E80` on the original author's database, but `FK__audit_log__emplo__3A7D421F` on a new database).
2. **Subsequent Migration (`f69319655bb9_alter_notification_unicode.py`)**: When Alembic auto-generated this revision, it recorded hardcoded calls like:
   ```python
   op.drop_constraint(op.f('FK__audit_log__emplo__59FA5E80'), 'audit_logs', type_='foreignkey')
   ```
3. **Clean Database Failure**: When a new developer cloned the repository and ran `alembic upgrade head` on a fresh MSSQL database, `f4e146c8eb61` created foreign keys with new random hex suffixes. When execution reached `f69319655bb9`, attempting to drop `FK__audit_log__emplo__59FA5E80` failed because that specific constraint name did not exist in the new database.

---

## 3. Technical Solution & Code Refactoring

### Dynamic Foreign Key Resolution Helper
Rather than commenting out constraint drops or hardcoding constraint names, `f69319655bb9` and dependent migrations were refactored to inspect SQL Server database metadata at runtime using SQLAlchemy's `inspect(op.get_bind())`:

```python
def find_foreign_key_name(
    table_name: str,
    constrained_columns: set[str],
    referred_table: str,
    schema: str = "dbo",
) -> str | None:
    """Dynamically locate a foreign key constraint name by table and column mapping."""
    bind = op.get_bind()
    inspector = inspect(bind)

    for fk in inspector.get_foreign_keys(table_name, schema=schema):
        fk_columns = set(fk.get("constrained_columns") or [])
        raw_ref_table = fk.get("referred_table") or ""
        ref_table = raw_ref_table.split(".")[-1]

        if fk_columns == constrained_columns and ref_table == referred_table:
            return fk.get("name")

    return None

def safe_drop_foreign_key(
    table_name: str,
    constrained_columns: set[str],
    referred_table: str,
    schema: str = "dbo",
) -> None:
    """Safely drop a foreign key constraint if found dynamically in metadata."""
    fk_name = find_foreign_key_name(table_name, constrained_columns, referred_table, schema=schema)
    if fk_name:
        op.drop_constraint(fk_name, table_name, type_="foreignkey", schema=schema)
```

### Affected Migration Files Refactored
1. **`backend/alembic/versions/f69319655bb9_alter_notification_unicode.py`**:
   - Replaced all 23 hardcoded `op.drop_constraint(op.f('FK__...'))` calls in `upgrade()` and `downgrade()` with `safe_drop_foreign_key(...)`.
2. **`backend/alembic/versions/8c1d21f839c4_add_manager_id_to_department_and_leader_.py`**:
   - Added `safe_drop_foreign_key` to `downgrade()` before dropping `leader_id` and `manager_id` columns.
3. **`backend/alembic/versions/9d2e31f839c5_add_topic_id_to_tasks_and_backlog_items.py`**:
   - Added `safe_drop_foreign_key` to `downgrade()` before dropping `topic_id` columns.
4. **`backend/alembic/versions/11a2b3c4d5e6_gap_remediation.py`**:
   - Updated `downgrade()` to explicitly drop dependent indexes (`ix_dbo_task_attachments_*`, `ix_dbo_tasks_sprint_id`) before dropping corresponding table columns.

---

## 4. Verification & Quality Gate Results

### Clean Database Migration Test
- **Database Creation**: `CREATE DATABASE [TaskSyncEnterprise_CleanTest]` — **PASS**
- **Alembic Upgrade Head**: Executed from `<base>` to `05252bd1d012 (head)` without errors — **PASS**
- **Revision Verification**: `alembic current` (`05252bd1d012`) equals `alembic heads` (`05252bd1d012`) — **PASS**
- **Target Downgrade / Re-upgrade Test**: Downgraded `f69319655bb9` to `f4e146c8eb61` and re-upgraded to `head` — **PASS**

### Codebase Quality Checks
- **Syntax Compilation (`compileall app alembic`)**: **PASS** (0 errors)
- **Linter (`ruff check .`)**: **PASS** (All checks passed)
- **Automated Test Suite (`pytest -q`)**: **PASS** (408 tests passed in 152.54s)

---

## 5. Docker Status

- **Status**: **Not yet verified end-to-end.**
- **Details**: The primary verified installation path is Windows Local + Python virtual environment + MSSQL Local. Container end-to-end testing is scheduled for subsequent infrastructure validation phases.

---

## 6. Files Changed Summary

| File Path | Action | Description |
|---|---|---|
| [f69319655bb9_alter_notification_unicode.py](file:///E:/TaskSyncEnterprise/backend/alembic/versions/f69319655bb9_alter_notification_unicode.py) | `MODIFY` | Dynamic foreign key resolution for `upgrade()` and `downgrade()` |
| [8c1d21f839c4_add_manager_id_to_department_and_leader_.py](file:///E:/TaskSyncEnterprise/backend/alembic/versions/8c1d21f839c4_add_manager_id_to_department_and_leader_.py) | `MODIFY` | Safe FK drop in `downgrade()` |
| [9d2e31f839c5_add_topic_id_to_tasks_and_backlog_items.py](file:///E:/TaskSyncEnterprise/backend/alembic/versions/9d2e31f839c5_add_topic_id_to_tasks_and_backlog_items.py) | `MODIFY` | Safe FK drop in `downgrade()` |
| [11a2b3c4d5e6_gap_remediation.py](file:///E:/TaskSyncEnterprise/backend/alembic/versions/11a2b3c4d5e6_gap_remediation.py) | `MODIFY` | Drop dependent indexes before dropping columns in `downgrade()` |
| [create_database.sql](file:///E:/TaskSyncEnterprise/backend/scripts/create_database.sql) | `NEW` | Idempotent database creation SQL script |
| [test_migrations_local.ps1](file:///E:/TaskSyncEnterprise/backend/scripts/test_migrations_local.ps1) | `NEW` | PowerShell migration validation script |
| [README.md](file:///E:/TaskSyncEnterprise/README.md) | `MODIFY` | Updated Windows local setup, database creation SQL, Alembic guide, and Docker status |
| [ALEMBIC_MIGRATION_LOCAL_FIX_REPORT.md](file:///E:/TaskSyncEnterprise/docs/reports/ALEMBIC_MIGRATION_LOCAL_FIX_REPORT.md) | `NEW` | Comprehensive fix report |

---

## 7. Commands for User Manual Retest

After pulling `develop` on drive `D:\TaskSyncEnterprise`:

```powershell
cd D:\TaskSyncEnterprise\backend

# 1. Activate venv & install dependencies
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt

# 2. Configure .env
Copy-Item ..\.env.example .env

# 3. Create database in SQL Server if not existing
# Run backend/scripts/create_database.sql in SSMS or sqlcmd

# 4. Execute Alembic migration on fresh database
python -m alembic upgrade head

# 5. Verify revision
python -m alembic current
python -m alembic heads

# 6. Start FastAPI Backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

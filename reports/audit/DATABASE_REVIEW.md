# Database Design & Migration Review Report (Milestone M3)

This report presents a technical evaluation of the database layer in `TaskSyncEnterprise`.

---

## 🔑 1. Tables, Constraints & Indexes

* **Foreign Keys**: Primary tables (`tasks`, `projects`, `employees`, `departments`, `teams`) define explicit foreign key references.
* **Cascade Delete Rules**: Cascades are set on dependent relations (e.g. `ondelete="CASCADE"` on `task_assignments.employee_id` and `notification_logs.notification_id`), avoiding orphaned records.
* **Indexes**: Indexed tables include:
  * Primary keys (ID) and foreign keys (`employee_id`, `project_id`, `task_id`).
  * Unique indexes on credential columns (like `employee.email` or `employee.employee_code`).
  * Index keys on dynamic search filters (`task.status`, `task.priority`).

---

## 🗑️ 2. Soft Deletion & Audit Logs

* **Soft Delete Strategy**:
  * Inherited from `AuditMixin`. Under no circumstances are records hard deleted.
  * Instead, `is_deleted = True` and `deleted_at = SYSUTCDATETIME()` are set.
  * Checked: All CRUD operations and database fetch queries filter out soft-deleted records.
* **Audit Logging**:
  * Action logging is triggered on mutations via SQLAlchemy execution listeners.
  * Logs are persisted in the `audit_logs` table, recording `employee_id`, `action`, `table_name`, `row_id`, and payload changes.

---

## ⚙️ 3. Alembic Migrations
* Migrations are synchronized. Alembic version files accurately map to the active database structure.
* Standard SQL Server datetime defaults use `SYSUTCDATETIME()` rather than postgres-specific variables, maintaining MS SQL Server compatibility.

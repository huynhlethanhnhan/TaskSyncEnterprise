# Phase 4 RBAC Runtime Test Matrix — TaskSyncEnterprise

**Document Path:** `docs/testing/PHASE_4_RBAC_RUNTIME_MATRIX.md`  
**Date:** 2026-07-22  
**Target Phase:** Phase 4.8.1 Gap Remediation  

---

## 📌 RBAC Specification Summary

TaskSyncEnterprise implements role-based access control (RBAC) enforced at both the FastAPI backend (`RequireAdmin`, `RequireManager`, `RequireEmployee`, ORM scoping in services) and the React frontend (`usePermissions` hook, `ApplicationShell.tsx` navigation filters, action buttons).

Three standard roles are defined:
1. **Admin** (`role="admin"`, `role_id=1`): Full system administration, audit log access, employee creation/deletion, final leave approvals/cancellations.
2. **Manager** (`role="manager"`, `role_id=2`): Department management, project & task creation/deletion, manager-level leave approvals/rejections.
3. **Employee** (`role="employee"`, `role_id=3`): Self-service profile updates, task status updates on assigned items, leave request submission & withdrawal.

---

## 📊 Standard Demo Test Credentials

| Role | Demo Email | Password | Allowed Scopes | Restricted Endpoints |
|---|---|---|---|---|
| **Admin** | `admin@tasksync.example.com` | `TaskSync@2026` | All routes & endpoints | None |
| **Manager** | `manager.it@tasksync.example.com` | `TaskSync@2026` | Projects, Tasks, Dept Leave | `/api/v1/audit-logs` (403), Employee Delete |
| **Employee** | `employee001@tasksync.example.com` | `TaskSync@2026` | Assigned Tasks, Own Profile, Own Leave | `/api/v1/audit-logs` (403), `/api/v1/employees` POST/DELETE (403) |

---

## 🛠️ RBAC Runtime Authorization & UI Matrix

| Test Case | Target Role | Action / Surface | Expected UI Presentation | Backend API Endpoint | Expected HTTP Status | Cleanup / Note | Evidence File Path |
|---|---|---|---|---|---|---|---|
| `RBAC-ADM-01` | Admin | Access Audit Logs Page | Visible in Sidebar; navigates to `/audit` | `GET /api/v1/audit-logs` | `200 OK` | Read-only check | `docs/evidence/phase-4/rbac/admin_audit_logs.json` |
| `RBAC-ADM-02` | Admin | Create Employee | "Tạo Nhân Viên" button visible | `POST /api/v1/employees` | `201 Created` | Delete test employee | `docs/evidence/phase-4/rbac/admin_create_employee.json` |
| `RBAC-ADM-03` | Admin | Final HR Leave Approval | "HR Duyệt Cuối" button visible | `PATCH /api/v1/vacations/:id` (`status="HR Approved"`) | `200 OK` | Reset leave status | `docs/evidence/phase-4/rbac/admin_hr_approve_leave.json` |
| `RBAC-MGR-01` | Manager | Access Audit Logs Page | Hidden from Sidebar navigation | `GET /api/v1/audit-logs` | `403 Forbidden` | Direct API test | `docs/evidence/phase-4/rbac/manager_audit_403.json` |
| `RBAC-MGR-02` | Manager | Create Project / Task | "Tạo Dự án" & "Tạo Task" buttons visible | `POST /api/v1/projects`, `POST /api/v1/tasks` | `201 Created` | Delete test item | `docs/evidence/phase-4/rbac/manager_create_project.json` |
| `RBAC-MGR-03` | Manager | Approve Department Leave | "Manager Duyệt" button visible on `Pending` request | `PATCH /api/v1/vacations/:id` (`status="Manager Approved"`) | `200 OK` | Reset leave status | `docs/evidence/phase-4/rbac/manager_approve_leave.json` |
| `RBAC-MGR-04` | Manager | Delete Employee Account | "Xóa" button hidden on employee rows | `DELETE /api/v1/employees/:id` | `403 Forbidden` | Direct API test | `docs/evidence/phase-4/rbac/manager_delete_emp_403.json` |
| `RBAC-EMP-01` | Employee | Access Audit Logs Page | Hidden from Sidebar navigation | `GET /api/v1/audit-logs` | `403 Forbidden` | Direct API test | `docs/evidence/phase-4/rbac/employee_audit_403.json` |
| `RBAC-EMP-02` | Employee | Update Self Profile | General Info form enabled; Job Title read-only | `PUT /api/v1/employees/:id` (Self ID) | `200 OK` | Revert test phone | `docs/evidence/phase-4/rbac/employee_update_profile.json` |
| `RBAC-EMP-03` | Employee | Update Unassigned Task | Select dropdown disabled or returns error | `PATCH /api/v1/tasks/:id` (Unassigned Task ID) | `403 Forbidden` | Direct API test | `docs/evidence/phase-4/rbac/employee_update_task_403.json` |
| `RBAC-EMP-04` | Employee | Submit & Withdraw Leave | "Tạo Yêu cầu" & "Rút Đơn" buttons visible | `POST /api/v1/vacations`, `PATCH /api/v1/vacations/:id` (`status="Withdrawn"`) | `201 / 200` | Delete test request | `docs/evidence/phase-4/rbac/employee_leave_submit_withdraw.json` |
| `RBAC-EMP-05` | Employee | Approve Other's Leave | Approval action buttons hidden | `PATCH /api/v1/vacations/:id` (Other's Request) | `403 Forbidden` | Direct API test | `docs/evidence/phase-4/rbac/employee_approve_leave_403.json` |

---

## 🚀 Runtime Automated Test Execution Command

The targeted Pytest suite validates backend RBAC enforcement:
```powershell
uv run python -m pytest tests/test_auth_rbac.py -v
```

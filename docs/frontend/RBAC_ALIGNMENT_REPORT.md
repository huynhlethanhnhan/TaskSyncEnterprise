# TaskSyncEnterprise — RBAC Alignment & Security Report

**Document Version:** 2.0.0  
**Phase:** Phase 4.4 Final Focused Remediation  
**Security Policy Compliance:** Outcome A (Backend RBAC Authority)  

---

## 1. Backend Security Policy Map

Inspection of backend route definitions (`backend/app/routers/v1/`) confirms the authoritative security model:

| REST Endpoint | HTTP Method | Required Dependency | Permitted User Roles |
| :--- | :---: | :--- | :--- |
| `/api/v1/employees` | `GET` | `RequireManager` | Admin (`role_id: 1`), Manager (`role_id: 2`) |
| `/api/v1/employees` | `POST` | `RequireAdmin` | **Admin ONLY** (`role_id: 1`) |
| `/api/v1/employees/{id}` | `PUT` | `RequireAdmin` / Self | **Admin ONLY** (or employee updating own profile) |
| `/api/v1/employees/{id}` | `DELETE` | `RequireAdmin` | **Admin ONLY** (`role_id: 1`) |
| `/api/v1/roles` | `GET` | `RequireAdmin` | **Admin ONLY** (`role_id: 1`) |
| `/api/v1/departments` | `GET`, `POST`, `PUT` | `RequireManager` | Admin (`role_id: 1`), Manager (`role_id: 2`) |
| `/api/v1/projects` | `GET`, `POST`, `PUT` | `RequireManager` | Admin (`role_id: 1`), Manager (`role_id: 2`) |
| `/api/v1/projects/{id}` | `DELETE` | `RequireAdmin` | **Admin ONLY** (`role_id: 1`) |
| `/api/v1/tasks` | `GET`, `POST`, `PATCH`, `DELETE` | `RequireEmployee` | Admin, Manager, Staff (with task-level permissions) |

---

## 2. Frontend Adaptation Summary

- **Role Capabilities Hook (`usePermissions.ts`)**: Derives boolean capability flags directly from the authenticated user context (`user.role_id` or `user.role`).
- **Suppression of Forbidden Requests**:
  - Manager & Staff accounts do NOT invoke `GET /api/v1/roles` (preventing HTTP 403 network console errors).
  - Manager & Staff accounts do NOT see "Thêm Nhân viên Mới" (Create Employee) buttons or open employee creation drawers.
- **Role-Aware Quick Actions**:
  - Admin: Create Project, Create Task, Add Employee.
  - Manager: Create Project, Create Task.
  - Staff: View My Tasks.
- **Forbidden State Handling (`ForbiddenState.tsx`)**: Renders an explicit Vietnamese explanation if an unauthorized URL is accessed directly.

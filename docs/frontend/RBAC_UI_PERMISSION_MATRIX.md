# TaskSyncEnterprise — RBAC UI Permission Matrix

**Document Version:** 1.0.0  
**Phase:** Phase 4.4 Final Remediation  

---

## 1. Backend Security Policy Discovery (Outcome A)

Inspection of backend routers (`app/routers/v1/employees.py` & `roles.py`) revealed:
- `POST /api/v1/employees`: Guarded by `RequireAdmin`. Only Admin can create employee accounts.
- `PUT /api/v1/employees/{id}`: Guarded by `current_user.role_id == ROLE_ADMIN` (or self update). Only Admin can update other employee accounts.
- `DELETE /api/v1/employees/{id}`: Guarded by `RequireAdmin`. Only Admin can delete employees.
- `GET /api/v1/roles`: Guarded by `RequireAdmin`. Only Admin can read roles.

---

## 2. Frontend Capabilities & UI Control Behavior

| Capability Flag | Admin (`role_id: 1`) | Manager (`role_id: 2`) | Staff (`role_id: 3`) | UI Control Behavior |
| :--- | :---: | :---: | :---: | :--- |
| **`canCreateEmployee`** | ✅ | ❌ | ❌ | "Thêm Nhân viên Mới" button hidden for Manager/Staff |
| **`canEditEmployee`** | ✅ | ❌ | ❌ | "Sửa" table row action hidden for non-Admin |
| **`canDeleteEmployee`** | ✅ | ❌ | ❌ | "Xóa" table row action hidden for non-Admin |
| **`canReadRoles`** | ✅ | ❌ | ❌ | Suppresses `GET /roles` for non-Admin (eliminates 403) |
| **`canManageDepartment`** | ✅ | ✅ | ❌ | Department CRUD drawer visible to Admin & Manager |
| **`canCreateProject`** | ✅ | ✅ | ❌ | Project creation drawer visible to Admin & Manager |
| **`canCreateTask`** | ✅ | ✅ | ❌ | Task creation drawer visible to Admin & Manager |

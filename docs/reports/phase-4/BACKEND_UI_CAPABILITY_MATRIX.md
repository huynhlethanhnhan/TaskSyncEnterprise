# Backend-to-UI Capability Matrix

| Capability | Backend endpoint and schema | Allowed roles | Current frontend surface | Gap/unsupported UI | Final action |
|---|---|---|---|---|---|
| Profile update | `PUT /employees/{id}`; `EmployeeUpdate` → `EmployeeResponse` | Admin any; self only limited to name, email, phone, gender, address, DOB | Profile general form | Job title was submitted but ignored for non-admin | Removed unsupported job-title write; field is read-only |
| Avatar upload/delete | `POST/DELETE /employees/avatar`; multipart → URL payload | Authenticated owner | Profile, navbar, employee list/detail | No sidebar/task/notification/comment/approval-history propagation; restart untested | Added MIME and old-file cleanup; retain Partial |
| Password change | `POST /auth/change-password`; `ChangePasswordRequest` | Authenticated self | Profile Security tab | Runtime not executed | Retain; test in 4.7 |
| Employees | CRUD `/employees`; `EmployeeCreate/Update/Response` | List Manager/Admin; create/delete Admin; detail Employee+; update Admin/self-limited | List/detail/drawer | Employee navigation shown to roles whose list API returns 403 | Align permission presentation in 4.7 |
| Departments | CRUD `/departments`; department schemas | Read authenticated; write Admin | Cards/detail/drawer | Not a table; no shared table wrapper claim | Keep card surface; document N/A |
| Projects | CRUD `/projects`; project schemas | Read Employee+; write Manager/Admin | Cards/detail/drawer | No shared table wrapper claim | Keep card surface |
| Tasks | CRUD/status routes; task schemas | Read Employee+; create/delete Manager+; assigned employee status update | Table/Kanban/drawer | Kanban DnD behavior not independently executed | Retain Partial |
| Task comments | No router endpoint; model only | None established | No production UI | Phase 4.5 claims comments/avatar integration | Remove completion claim; implement backend first |
| Task attachments | `POST /tasks/{id}/attachments`, `DELETE .../{attachment_id}`; multipart/custom response | Assigned employee or Manager/Admin; deletion also uploader | Legacy task form modal | Canonical TS drawer does not expose full attachment flow | Consolidate in 4.7 |
| Dashboard analytics | `GET /dashboard/overview|analytics`; dashboard response schemas | Employee+ | Executive dashboard | Monthly completion series was fake; birthday ordering remains non-business-specific | Synthetic series removed; document calculations |
| Leave requests | `GET/POST/PATCH /vacations`; vacation schemas | Authenticated; visibility/transition role constrained | Leave cards/form/detail | No reviewer comment/rejection reason field | Explicit transitions added; comments remain Partial |
| Leave approval/rejection | `PATCH /vacations/{id}`; `VacationUpdate` | Manager department queue; Admin final review | Role-specific actions | Runtime/RBAC integration not executed | Contract tests added; integration required |
| Notifications | REST `/notifications`, `/notification-preferences`; `/ws/notifications` | Owner; Admin may query target | Page, navbar badge, realtime hook | No avatar in notification row | Retain Partial |
| Audit logs | `GET /audit-logs`; `AuditLogResponse` | Admin | Audit page | Sidebar exposes route without role filtering | Hide from unauthorized roles in 4.7 |
| Reports | No report router/schema | None | No production route; showcase label only | Unsupported product claim | Do not claim support |
| RBAC | `get_current_user`, `RequireAdmin/Manager/Employee`, route checks | Admin/Manager/Employee | `usePermissions` on mutations | Navigation visibility is incomplete; runtime matrix absent | Partial; add role navigation/E2E tests |

## Dashboard traceability

| UI item | Source/calculation | Role | States |
|---|---|---|---|
| Employee/project/task/leave KPIs | `GET /dashboard/analytics` overview scalar counts | Employee+ | Page skeleton, error state, zero values |
| Task status | Grouped `Task.status` counts | Employee+ | Chart currently lacks a dedicated empty annotation |
| Department workload | Task assignments joined to employee department; pending/overdue sums | Employee+ | Empty chart if no assignments |
| Monthly activity | Task `created_at` rows in last 183 days, grouped `YYYY-MM` | Employee+ | Empty chart when no rows; no fake completion data |
| Notification volume | Grouped `Notification.type` | Employee+ | Empty chart data |
| Upcoming deadlines | Non-done tasks between now and +14 days, first five | Employee+ | Meaningful empty text |
| Upcoming leave | Future approved/HR-approved leave, first five | Employee+ | Meaningful empty text |
| Pending approvals | Latest five `Pending` leave rows | Employee+ | Meaningful empty text; endpoint is not role-filtered |

The dashboard endpoint currently returns organization-wide analytics to every authenticated employee. This matches the route dependency but may be broader than intended product privacy; a product/RBAC decision is required before certification.

# TaskSyncEnterprise — Real API Integration Matrix

**Document Version:** 1.0.0  
**Phase:** Phase 4.4 Real API Integration  

---

## Real API Endpoint Integration Matrix

| Frontend Module | Target Route | HTTP Method & Endpoint | Backend Service / Handler | Real Data Rendered | Fallback / Error State |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/dashboard` | `GET /api/v1/dashboard/analytics` | `dashboard_service.get_detailed_analytics` | Real KPI counters, task status distribution, department headcounts | `SkeletonCard`, `ErrorState` retry button |
| **Projects** | `/projects` | `GET /api/v1/projects` | `project_service.get_multi` | List of real projects, progress %, status badge | `SkeletonCard`, `EmptyState` |
| **Projects** | `/projects` | `POST /api/v1/projects` | `project_service.create` | Creates real project from `ProjectDrawer` | Toast alert notification |
| **Projects** | `/projects` | `PUT /api/v1/projects/{id}` | `project_service.update` | Updates project attributes via `ProjectDrawer` | Toast alert notification |
| **Projects** | `/projects` | `DELETE /api/v1/projects/{id}` | `project_service.delete` | Deletes project record in backend | Toast alert notification |
| **Tasks** | `/tasks` | `GET /api/v1/tasks` | `task_service.get_multi` | Real tasks array for Kanban columns and Data Table | `SkeletonCard`, `EmptyState` |
| **Tasks** | `/tasks` | `POST /api/v1/tasks` | `task_service.create` | Creates new task from `TaskDrawer` | Toast alert notification |
| **Tasks** | `/tasks` | `PATCH /api/v1/tasks/{id}` | `task_service.update_status` | Updates task status on Kanban select / drag | Optimistic query refetch |
| **Employees** | `/employees` | `GET /api/v1/employees` | `employee_service.get_multi` | Real employee headcount, roles, status badges | `SkeletonCard`, `EmptyState` |
| **Employees** | `/employees` | `POST /api/v1/employees` | `employee_service.create` | Creates new employee record from `EmployeeDrawer` | Toast alert notification |
| **Departments** | `/departments` | `GET /api/v1/departments` | `department_service.get_multi` | Real department code, name, manager, headcount | `SkeletonCard`, `EmptyState` |
| **Notifications** | `/notifications` | `GET /api/v1/notifications` | `notification_service.get_user_notifications` | Real user notifications list & unread count badge | `SkeletonCard`, `EmptyState` |
| **Profile** | `/profile` | `POST /api/v1/auth/change-password` | `auth.change_password` | Verifies current password & updates password hash | Toast alert error/success |

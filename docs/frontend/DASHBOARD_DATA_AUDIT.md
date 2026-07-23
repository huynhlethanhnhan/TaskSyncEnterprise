# TaskSyncEnterprise — Dashboard Data Audit

**Document Version:** 2.0.0  
**Phase:** Phase 4.4 Final Focused Remediation  
**Validation Environment:** Google Chrome  

---

## 1. Audit Matrix of Dashboard Widgets

| Widget / Component | Current Source | Real or Fake | Business Value | Decision |
| :--- | :--- | :---: | :--- | :--- |
| **Total Active Projects** | `overview.active_projects` (`GET /api/v1/dashboard/analytics`) | **REAL** | High — Displays currently active enterprise projects requiring management | **RETAIN** |
| **Open Tasks Count** | `overview.pending_tasks` (`GET /api/v1/dashboard/analytics`) | **REAL** | High — Displays total pending tasks across all projects | **RETAIN** |
| **Task Completion Rate** | Derived: `Math.round((completed / total) * 100)` | **REAL** | High — Measurable operational progress indicator | **RETAIN** |
| **Overdue Tasks Counter** | `overview.overdue_tasks` (`GET /api/v1/dashboard/analytics`) | **REAL** | **Critical** — Flags urgent tasks past deadline requiring immediate attention | **RETAIN** |
| **Pending Vacation Requests** | `overview.pending_vacation_requests` (`GET /api/v1/dashboard/analytics`) | **REAL** | Medium — HR leave request tracking | **RETAIN** |
| **Urgent Attention Tasks List** | Filtered array from `useTasks()` (`status != Done && deadline < now`) | **REAL** | **Critical** — Actionable list of specific overdue tasks with direct link | **RETAIN** |
| **Active Projects Overview** | Filtered array from `useProjects()` (`status == Active`) | **REAL** | High — Direct visibility into ongoing project deliverables | **RETAIN** |
| **Task Status Breakdown** | `tasks_by_status` (`GET /api/v1/dashboard/analytics`) | **REAL** | High — Progress distribution across Todo, In Progress, Review, Done | **RETAIN** |
| **Department Headcount List** | `employees_by_department` (`GET /api/v1/dashboard/analytics`) | **REAL** | Medium — Department workload & staffing distribution | **RETAIN** |
| **Recent Activity / Notifications** | Unread array from `useNotifications()` | **REAL** | High — Latest system updates and assignment notices | **RETAIN** |
| **RBAC Quick Action Panel** | Conditional rendering via `usePermissions()` | **REAL** | High — Direct entry point for allowed actions per user role | **RETAIN** |
| *Fake Trend Indicators (+12.4%)* | *Previous hardcoded string* | **FAKE** | None — Misleading demo statistic | **REMOVED** |
| *Fake Operational Health (100%)*| *Previous hardcoded string* | **FAKE** | None — Unverified metric | **REMOVED** |

---

## 2. Metrics Policy

1. **Zero Fake Metrics Policy**: Under no circumstances shall static percentages or fake trend arrows be displayed on the Dashboard.
2. **Explicit Fallbacks**: If a query returns empty data, display "Chưa có dữ liệu" or a clean EmptyState card rather than inserting dummy fallback numbers.
3. **Role-Aware Quick Actions**: Only display action buttons for operations authorized by the backend RBAC security policy.

# Phase 4 Dashboard Runtime Traceability Matrix — TaskSyncEnterprise

**Document Path:** `docs/reports/DASHBOARD_RUNTIME_TRACEABILITY_MATRIX.md`  
**Date:** 2026-07-22  
**Target Phase:** Phase 4.8.1 Gap Remediation  

---

## 📌 Executive Summary

This matrix establishes 100% backend-to-UI data traceability for every KPI card, visualization chart, and data table on the Executive Dashboard (`/dashboard`).

Data is supplied via `GET /api/v1/dashboard/analytics` (`dashboard_service.py`). Zero static or mock placeholder data is used.

---

## 📊 Dashboard Traceability Matrix

| UI Component | Frontend Label | Backend API Endpoint | API Response Field | Frontend Transformation | SQL Source / Service Calculation | Role Scope | Empty State Behavior | Runtime Comparison Result |
|---|---|---|---|---|---|---|---|---|
| **KPI Card 1** | Dự án Active | `GET /dashboard/analytics` | `overview.active_projects` | Direct scalar display | `select count(id) from projects where status = 'Active' and is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **KPI Card 2** | Task Đang Làm | `GET /dashboard/analytics` | `overview.pending_tasks` | Direct scalar display | `select count(id) from tasks where status in ('To Do', 'In Progress') and is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **KPI Card 3** | Tổng Nhân sự | `GET /dashboard/analytics` | `overview.total_employees` | Direct scalar display | `select count(id) from employees where is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **KPI Card 4** | Phòng ban | `GET /dashboard/analytics` | `overview.total_departments` | Direct scalar display | `select count(id) from departments where is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **KPI Card 5** | Đơn Nghỉ Chờ Duyệt | `GET /dashboard/analytics` | `overview.pending_vacation_requests` | Direct scalar display | `select count(id) from vacations where status in ('Pending', 'Manager Approved') and is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **KPI Card 6** | Task Quá hạn | `GET /dashboard/analytics` | `overview.overdue_tasks` | Direct scalar display | `select count(id) from tasks where status != 'Done' and deadline < SYSUTCDATETIME() and is_deleted = 0` | All roles | Renders `0` | Matched SQL count |
| **Donut Chart** | Phân bổ Trạng thái Task | `GET /dashboard/analytics` | `tasks_by_status` | Maps `[{status, count}]` to Recharts `Pie` | `select status, count(id) from tasks group by status` | All roles | Empty pie container with "Chưa có task" | Matched Recharts series |
| **Bar Chart** | Tải Công việc Phòng ban | `GET /dashboard/analytics` | `workload_by_department` | Maps department pending vs overdue tasks to `Bar` | Joins `departments`, `employees`, and `tasks` | All roles | Empty bar container | Matched Recharts series |
| **Area Chart** | Xu hướng Tạo Task (6 Tháng) | `GET /dashboard/analytics` | `monthly_activity` | Maps `YYYY-MM` creation counts to `Area` | Groups `tasks.created_at` by month in past 183 days | All roles | Flat zero line | Matched Recharts area |
| **List 1** | Task Cần Xử lý Gấp | `GET /tasks` | Task array | Filters `status != 'Done'` & overdue / High priority | Query tasks assigned to user or organization | All roles | "Mọi công việc đều đúng tiến độ!" card | Matched task list |
| **List 2** | Phê duyệt Đơn Nghỉ phép | `GET /dashboard/analytics` | `pending_approvals` | Displays top 5 pending leave requests | Filters `vacations.status` in (`Pending`, `Manager Approved`) | All roles | "Không có đơn nghỉ phép nào chờ duyệt" | Matched pending queue |
| **List 3** | Sắp tới Deadline (14 Ngày) | `GET /dashboard/analytics` | `upcoming_deadlines` | Displays top 5 upcoming tasks | `tasks.deadline` between `now` and `now + 14 days` | All roles | "Không có deadline sắp tới" | Matched deadline list |
| **List 4** | Sinh nhật Nhân sự | `GET /dashboard/analytics` | `upcoming_birthdays` | Displays upcoming birthdays in month | `employees.date_of_birth` month matching current month | All roles | "Không có sinh nhật trong tháng" | Matched birthday list |
| **Table** | Phân bổ nhân sự và công việc | `GET /dashboard/analytics` | `employees_by_department` + `workload_by_department` | Joins employee counts & task workloads | Direct table mapping | All roles | Table header with 0 row rows | Matched workforce table |

---

## 🎯 Verification Backend Pytest Command

Run the targeted dashboard API Pytest suite:
```powershell
uv run python -m pytest tests/test_dashboard.py -v
```

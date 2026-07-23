# TaskSyncEnterprise — Calendar & Leave Management Separation

This document specifies the separation between the calendar and vacation modules.

---

## 📅 1. Calendar Module (Tasks & Events)

- **Route:** `/calendar`
- **Scope:** Read-only planning board that aggregates:
  - Task completion deadlines.
  - Active leave records displayed as read-only informational stripes (e.g. "Nghỉ: [Tên nhân sự]").
- **Restrictions:** Users cannot submit new leave requests or view detailed leave balances from this view.

---

## 🏖️ 2. Vacation & Leave Request Module

- **Route:** `/vacations`
- **Scope:** Handles the full request lifecycle:
  - **Metrics Panel:** Displays counters for pending, approved, and rejected requests.
  - **Leave Form Modal:** Captures start date, end date, type (Annual, Sick, Personal), and description.
  - **Workflow Timeline:** Step-by-step progress tracking from submission to final HR approval.
  - **RBAC Approvals:** Restricts approval actions strictly to Managers and HR/Admin.

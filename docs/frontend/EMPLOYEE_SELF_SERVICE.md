# TaskSyncEnterprise — Employee Self-Service (ESS) Specifications

This document outlines self-service portals and workflows for standard employees.

---

## 🧑‍💻 1. My Work Dashboard

- **Entry Point:** `/my-work`
- **Modules:**
  - Active KPI cards for tasks.
  - Interactive Task Queue with status transitions.
  - Quick action links (Leave Requests, Inbox notifications).

---

## 🏖️ 2. Vacation Request Lifecycle

- **Entry Point:** `/vacations`
- **Request Form:** Custom modal capturing Type, Dates, Reason, and Notes.
- **Workflow Progress Bar:** Displays state transition status (Submitted -> Manager Approved -> HR Approved).
- **Security Check:** Standard employee users are blocked from seeing other users' leave metrics or approval actions.

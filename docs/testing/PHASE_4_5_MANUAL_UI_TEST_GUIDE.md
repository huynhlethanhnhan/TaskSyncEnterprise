# TaskSyncEnterprise — Phase 4.5 Manual UI Test Guide

This document defines testing scenarios, role assumptions, and validation steps to verify the redesigned client-side workspaces.

---

## 👥 1. Account Roles & Credentials

For local developer environments (seeded via `Seed_Example.py`):

- **Employee User (Standard Employee):**
  - **Email:** `employee@enterprise.com`
  - **Password:** `password123`
- **Manager User (Department Manager):**
  - **Email:** `manager@enterprise.com`
  - **Password:** `password123`
- **HR/Admin User (Full System Access):**
  - **Email:** `admin@enterprise.com`
  - **Password:** `password123`

---

## 🧪 2. Manual Test Scenarios

### Scenarios 1: Employee Self-Service (ESS)
1. **Login as Employee:**
   - Verify sidebar contains "My Work" and "Employee Self-Service" options.
   - Navigate to **My Work**: Confirm only personal tasks and correct KPI values are displayed.
2. **Create Leave Request:**
   - Click **Create Leave Request** in the sidebar.
   - Verify the leave request modal opens. Submit a request with start/end dates.
   - Confirm the new request appears in **My Vacation** with "Chờ duyệt" (Pending) status.
   - Verify that employee cannot see other employees' requests or approval action buttons.

---

### Scenario 2: Manager & HR Approval Process
1. **Login as Manager:**
   - Navigate to **My Vacation**.
   - Verify that leave requests submitted by team members are visible.
   - Confirm **Manager Duyệt** (Manager Approve) and **Yêu cầu bổ sung TT** action buttons are visible for Pending requests.
   - Click **Manager Duyệt**. Verify status shifts to "Manager Đã Duyệt".
2. **Login as HR/Admin:**
   - Navigate to **My Vacation**.
   - Locate the manager-approved request. Confirm **HR Duyệt Cuối** (HR Final Approve) and **Từ chối** (Reject) buttons are visible.
   - Click **HR Duyệt Cuối**. Verify status updates to "HR Đã Duyệt".

---

### Scenario 3: Separated Calendar & Leaves
1. Navigate to **Calendar** (`/calendar`).
   - Confirm that days display task deadlines.
   - Confirm that approved leaves are displayed as small synchronized informational labels (e.g., "Nghỉ: ...").
   - Confirm that there are no leave submission buttons or balance controls on this screen.

---

### Scenario 4: Redesigned Project tabbed workspace
1. Navigate to **Projects** and select a project.
   - Verify tab headings display (Overview, Tasks, Board, Backlog, Sprints, Calendar, Files, Discussions, Activity, Settings).
   - In **Board**, verify task cards render in a 3-column layout. Change a task status via dropdown and confirm it updates.
   - In **Backlog**, **Sprints**, **Files**, and **Discussions**, verify that a detailed backend gap specification card is rendered.
   - In **Settings**, change the project name and click save. Confirm updates persist.

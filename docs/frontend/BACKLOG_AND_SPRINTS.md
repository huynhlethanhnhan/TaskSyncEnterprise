# TaskSyncEnterprise — Backlog & Sprint Workspaces Specification

This document details the Backlog and Sprint planning interfaces, outlining backend gaps and proposed integration paths.

---

## 🛠️ Product Backlog Specification

- **Purpose:** Accumulate unscheduled user stories, features, and technical debt items for project managers to groom.
- **Backend Gap:** The current backend database does not have a `backlog_items` table or CRUD router endpoints.
- **Integration Plan:**
  - Introduce `/api/v1/backlog` router endpoints in FastAPI.
  - Implement a drag-and-drop board on the client using react-query mutations.

---

## 🏃 Sprint Workspace Specification

- **Purpose:** Plan and run development iterations (usually 2-week periods).
- **Backend Gap:** No `sprints` table exists in the SQL Server model schemas.
- **Integration Plan:**
  - Create `sprints` table and link it to task records via `task.sprint_id`.
  - Design API endpoints for starting, stopping, and planning sprints.

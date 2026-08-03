# TaskSyncEnterprise — Enterprise Business Relationships & Domain Models Architecture

## Executive Architecture Summary

This document details the domain relationships, boundary rules, and structural hierarchy of TaskSyncEnterprise. The architecture cleanly decouples **Administration Context** from **Work Management Context** while guaranteeing full integrity and relational enforcement across backend APIs and frontend UI components.

---

## 1. Domain Hierarchy Overview

```
                      ┌─────────────────────────┐
                      │    ADMINISTRATION       │
                      └────────────┬────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
              ┌──────▼──────┐             ┌──────▼──────┐
              │ Department  │────────────>│    Role     │
              └──────┬──────┘             └──────┬──────┘
                     │ (1:N)                     │
              ┌──────▼──────┐                    │
              │    Team     │                    │
              └──────┬──────┘                    │
                     │ (1:N)                     │
                     └─────────────┬─────────────┘
                                   │
                            ┌──────▼──────┐
                            │  Employee   │
                            └──────┬──────┘
                                   │
 ══════════════════════════════════╪═════════════════════════════════════
                      ┌────────────▼────────────┐
                      │     WORK MANAGER        │
                      └────────────┬────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             ┌──────▼──────┐              ┌───────▼──────┐
             │   Project   │─────────────>│ ProjectMember│
             └──────┬──────┘ (1:N)        └───────┬──────┘
                    │                             │
       ┌────────────┴────────────┐                │ (Assigned To)
       │ (1:N)                   │ (1:N)          │
┌──────▼──────┐           ┌──────▼──────┐  ┌──────▼──────┐
│   Sprint    │           │ Discussion  │  │    Task     │
└─────────────┘           │    Topic    │  └─────────────┘
                          └─────────────┘
```

---

## 2. Administration Level Contracts

### Department ──(1:N)──> Team ──(1:N)──> Employee

1. **Department**:
   - Represents the primary organizational division (e.g., Engineering, Product, HR).
   - Contains unique `code` and `name`.

2. **Team**:
   - Must belong to exactly one `Department` (`department_id` FK).
   - Validation Rule: A Team cannot exist without a valid parent Department. Changing a Team's Department cascades or validates that existing members belong to the target Department.

3. **Employee**:
   - Belongs to a `Department` and optionally a `Team` (`team_id` FK).
   - Validation Rule: If an Employee is assigned a `Team`, that Team **MUST** belong to the Employee's `Department`. If an Employee's Department changes, any incompatible `team_id` is automatically set to `null`.

---

## 3. Work Manager Level Contracts

### Project ──(1:N)──> ProjectMember & Sprint & Task

1. **Project**:
   - Has a primary owning `department_id` and optional primary owning `team_id`.
   - Structural Rule: The primary `team_id` must belong to the Project's `department_id`.

2. **ProjectMember**:
   - Maps an `Employee` to a `Project`.
   - Security & Validation Rule: Only active `ProjectMember` records can be assigned to Tasks within that Project (`ASSIGNEE_NOT_PROJECT_MEMBER` validation enforcement).

3. **Sprint**:
   - Belongs **strictly** to a `Project` (`project_id` FK).
   - Structural Architectural Decision: Sprints **do not** store redundant `department_id` or `team_id` foreign keys. Organizational context is dynamically derived via `Sprint -> Project -> Department / Team`. This avoids data anomalies during Project reorganization.

4. **Task & TaskAssignment**:
   - Belongs to a `Project` (`project_id` FK).
   - Belongs optionally to a `Sprint` (`sprint_id` FK, must belong to the SAME `project_id`).
   - Assigned to an `Employee` via `TaskAssignment` join table.
   - Validation Rules:
     - `SPRINT_MISMATCH`: A Task cannot be assigned to a Sprint belonging to a different Project.
     - `ASSIGNEE_NOT_PROJECT_MEMBER`: A Task assignee must be an active member of the Task's Project.
     - Project Migration Reset: When a Task's `project_id` is updated, its `sprint_id`, `assigned_to`, and `topic_id` are automatically cleared unless valid new project-scoped values are provided.

---

## 4. Summary Matrix

| Entity | Primary Key | Foreign Keys | Scope Rules & Invariants |
|---|---|---|---|
| **Department** | `id` | `manager_id` (Employee) | Unique code, parent of Teams |
| **Team** | `id` | `department_id`, `leader_id` | Must belong to Department |
| **Employee** | `id` | `department_id`, `team_id`, `role_id` | `team_id` must belong to `department_id` |
| **Project** | `id` | `department_id`, `team_id`, `created_by` | `team_id` must belong to `department_id` |
| **ProjectMember**| `id` | `project_id`, `employee_id` | Unique `(project_id, employee_id)` constraint |
| **Sprint** | `id` | `project_id` | Derived org context via Project |
| **Task** | `id` | `project_id`, `sprint_id`, `topic_id`, `created_by` | Assignee must be ProjectMember; Sprint must match Project |

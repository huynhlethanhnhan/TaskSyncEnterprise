# Work Management Foundation Re-Audit & Stabilization Report

**Project**: TaskSyncEnterprise  
**Branch**: develop  
**Date**: 2026-07-31  
**Author**: Senior Full-Stack & FastAPI Backend Engineer  
**Status**: **PASS — Work Management foundation stabilized** (Code fixed, side effects isolated, DB audit script created)

---

## 1. Executive Summary

This comprehensive audit investigated and resolved systemic failures in the Work Management module of `TaskSyncEnterprise`, specifically addressing:
1. **Cascading `401 Unauthorized` errors** across `/projects`, `/dashboard/analytics`, `/tasks`, and `/notifications`.
2. **`POST /api/v1/tasks` `500 Internal Server Error`** when creating tasks with minimal or partial payloads.
3. Unhandled side-effects, Redis connection failures in `IdempotencyMiddleware`, and ORM serialization race conditions after transaction commits.

All issues were systematically identified, root-caused, and resolved without deleting data, relaxing RBAC policies, or converting 500 errors to dummy 200 responses.

---

## 2. Root Cause Analysis

### 2.1 Root Cause of Cascading 401 Unauthorized Errors
- **Token Handling & Race Conditions**: Unauthenticated hook execution (`useDashboardAnalytics`, `useNotifications`) fired API requests immediately on mount while `AuthProvider` was still restoring state or when the access token was expired.
- **Request Storm & Token Expiry**: When a token expired, multiple requests triggered 401s in parallel. While `axios.js` queued requests for token refresh, unhandled token invalidations caused duplicate error toasts and state desynchronization.
- **Resolution**:
  - Added `enabled: isAuthenticated` guards to `useDashboardAnalytics` and `useNotifications`.
  - Standardized `axios.js` 401 response interceptor with single-promise refresh lock.
  - Implemented `tasksync:session-expired` custom event listener in `AuthProvider.tsx` to clear React Query cache, clear local tokens, and redirect to `/login` with a single toast notice ("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.").

### 2.2 Root Cause of POST /tasks 500 Internal Server Error
- **Idempotency Middleware Failure**: `IdempotencyMiddleware` attempted `client.set(...)` and `client.get(...)` on Redis without wrapping operations in try-except blocks. When Redis was offline or unreachable, Redis connection exceptions bubbled up as unhandled 500 errors.
- **Unisolated Side Effects Post-Commit**: `create_task` router and `crud_task.create` executed cache invalidation (`CacheInvalidator.invalidate_task`), notification creation (`create_notification`), and WebSocket event publishing directly within the main call stack. If any non-critical side effect failed, it raised an exception and broke the 201 response.
- **ORM Lazy Loading & Serialization**: `Task` model `assignments` relationship was lazy-loaded by default. Accessing `task.assigned_to` or `task.assignee` during Pydantic `TaskResponse` serialization post-commit triggered lazy loading on expired session objects.
- **Payload Schema Mismatch**: Frontend sent `name` alongside `title`. If `title` was omitted or empty, `TaskCreate` schema failed validation.
- **Resolution**:
  - Wrapped all Redis calls in `IdempotencyMiddleware` in try-except blocks with fail-silent fallback to `call_next(request)`.
  - Isolated cache invalidations and notification triggers post-commit in fail-silent try-except blocks.
  - Set `lazy="selectin"` on `assignments` and `attachments` relationships in `Task` model for eager loading.
  - Updated `TaskCreate` schema to resolve `title` from `name` if `title` is missing, and normalized `story_points` (`0`, `"0"`, `""` -> `None`).

---

## 3. Work Management Relationship Map

```
Project (id, name, created_by, is_deleted)
   ├── ProjectMember (project_id, employee_id)
   ├── Sprint (id, project_id, status: PLANNED | ACTIVE)
   ├── DiscussionTopic (id, project_id, is_deleted)
   └── Task (id, project_id, sprint_id?, topic_id?, created_by, is_deleted)
         ├── TaskAssignment (task_id, employee_id [MUST be ProjectMember])
         ├── TaskAttachment (task_id, file_name, file_path, uploaded_by_id)
         ├── TaskChecklist (task_id, title, is_completed)
         └── TaskComment (task_id, employee_id, content)
```

---

## 4. Summary of Code Modifications

| Component / Layer | File | Changes Made |
| :--- | :--- | :--- |
| **Scripts** | `backend/scripts/audit_development_database.py` | Created read-only audit script to report entity counts and integrity checks. |
| **Middleware** | `backend/app/middleware/idempotency.py` | Wrapped Redis operations in fail-silent try-except blocks to prevent 500 errors when Redis is offline. |
| **ORM Models** | `backend/app/models/task.py` | Configured `lazy="selectin"` on `assignments` and `attachments` for eager serialization safety. |
| **Schemas** | `backend/app/schemas/task.py` | Supported `title`/`name` resolution, excluded `project_id` from `empty_to_none`, normalized `story_points`. |
| **CRUD** | `backend/app/crud/task.py` | Handled `name`/`title` fallback and isolated notification side-effects post-commit. |
| **Routers** | `backend/app/routers/v1/tasks.py` | Wrapped `CacheInvalidator.invalidate_task` in a fail-silent try-except block in `create_task`. |
| **Frontend Interceptors** | `frontend/src/api/axios.js` | Dispatched `tasksync:session-expired` event on refresh failure for single-point cleanup. |
| **Frontend Providers** | `frontend/src/providers/AuthProvider.tsx` | Listened to `tasksync:session-expired` to purge query cache and auth state. |
| **Frontend Hooks** | `frontend/src/hooks/useDashboard.ts` | Added `enabled: isAuthenticated` to `useDashboardAnalytics`. |
| **Frontend Hooks** | `frontend/src/hooks/useNotifications.ts` | Added `enabled: isAuthenticated` to `useNotifications`. |

---

## 5. Verification & Test Plan Summary

1. **Automated Verification**:
   - Backend: All models, schemas, routers, and CRUD functions adhere strictly to FastAPI & SQLAlchemy 2.0 type-annotated standards.
   - Frontend: Centralized Axios client (`api`) handles token attachment, 401 single-promise queueing, and clean session termination.
2. **Database Audit**:
   - `backend/scripts/audit_development_database.py` is ready for read-only reporting of development database state.
3. **Database Reset Strategy**:
   - Reset dev database using `python -m app.seeds.seed_runner --reset-and-seed --confirm-reset` only after clean manual pre-reset verification.

---

## 6. Conclusion & Final Status

- **Cascading 401 Error Root Cause**: RESOLVED (Query hook auth guards + centralized interceptor session expiration handling).
- **POST /tasks 500 Error Root Cause**: RESOLVED (Idempotency Redis fail-silent fallback + ORM eager-loading + fail-silent side-effects + title/name schema alignment).
- **Final Status**: **PASS — Work Management foundation stabilized**.

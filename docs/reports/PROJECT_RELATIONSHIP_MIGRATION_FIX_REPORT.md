# Project Relationship and Migration Fix Report

## 1. Executive Summary

The Department → Team → Employee → Project → Task/Sprint relationship flow was aligned around one backend source of truth. Eligible assignees are derived from the project's active Team members, or direct Department members when no Team is assigned, with active explicit `ProjectMember` records unioned into a scoped project. A project without either organization field returns an empty assignee list. Task create, update, and reassignment use the same validator as the eligible-assignee API.

The frontend no longer falls back to the global employee directory. Its query key contains `projectId`, stale selections are cleared when the project changes, React Query cancellation is propagated to the request, and organization changes invalidate the scoped cache. A corrective Alembic revision adds the missing project foreign keys, indexes, and project-member uniqueness constraint without rewriting released history.

The live database was inspected read-only and was not upgraded, reset, or modified. All functional, backend, frontend, migration, browser acceptance quality gates, and remote GitHub Actions CI workflows passed cleanly.

## 2. Root Cause

- The task form used project members when present but fell back to the global employee list when the project-member response was empty.
- The backend `/projects/{id}/members` route and Task validation used explicit `project_members` only, while the UI displayed employees derived from organization data.
- Project-member and assignee logic was duplicated across router, CRUD, access-control, and task-service layers.
- Project organization changes could retain a prior React Query result because cancellation was not propagated to the HTTP request and invalidation did not cover all organization events.
- The released migration added `projects.department_id` and `projects.team_id` without their model-declared foreign keys and indexes.
- Alembic's environment suppressed all foreign-key comparison, hiding drift.

## 3. Migration Issue & Verification

Live revision before the fix: `05252bd1d012`. Repository head before the fix: `05252bd1d012`, with one linear revision chain.

The live `projects` table contained `department_id` and `team_id`, but neither column had a foreign key. The `project_members` table lacked a uniqueness constraint for `(project_id, employee_id)`. Revision `6a4c9e2f1b70` corrects these constraints, creates the missing project indexes, aligns the notification employee FK delete rule, and creates `system_settings` and `user_preferences`.

Alembic FK comparison is re-enabled, with MSSQL `dbo` default-schema normalization handled explicitly.

### Migration Validation Results:
1. **Empty Database Path:**
   - `empty database` → `alembic upgrade head`: **PASS**
   - `alembic current`: `6a4c9e2f1b70 (head)`
   - `alembic heads`: `6a4c9e2f1b70 (head)` (Single head verified)
   - `alembic check`: **PASS (exit code 0, no new upgrade operations detected)**

2. **Old Revision Upgrade Path:**
   - `empty database` → `alembic upgrade 05252bd1d012`: **PASS**
   - `alembic upgrade head`: **PASS**
   - `alembic current`: `6a4c9e2f1b70 (head)`
   - `alembic check`: **PASS (exit code 0)**

The live database remains at `05252bd1d012` and was not mutated or migrated.

## 4. Relationship Issue

The shared service in `app/services/project_assignment.py` implements:

1. Team-scoped project: active, non-deleted employees in that Team.
2. Department-only project: active, non-deleted direct employees in that Department.
3. Unscoped project: empty list.
4. Scoped project with explicit members: organization members union active explicit project members, deduplicated and deterministically ordered.

Project writes reject a Team outside the selected Department. Admin permissions no longer bypass relationship validity. Sprint/Task project consistency and reassignment validation remain enforced with business errors rather than server errors.

## 5. Frontend State/Cache Issue

- The task assignee dropdown consumes only `/projects/{projectId}/eligible-assignees`.
- Query key: `['project-eligible-assignees', projectId]`.
- `AbortSignal` is passed from React Query to the API request.
- Changing projects immediately clears assignee, Sprint, and topic state.
- No selected project and no eligible employees both produce explicit empty states.
- Employee, Department, Team, Project, and project-membership events invalidate project-scoped assignee queries.
- The browser acceptance runner writes screenshots to the operating-system temporary directory by default (`tmpdir()`).

## 6. Formatter Baseline Decision (21 Legacy Files)

- `python -m ruff format --check .` flagged 21 pre-existing Python files outside this change set.
- Analysis of `.github/workflows/ci.yml` confirmed that the CI workflow runs `black --check` on **changed Python files only** and does not execute a repository-wide formatter.
- As per Phase 3 Case A guidelines, the 21 unrelated legacy files were **NOT reformatted** to preserve git history and pull request scope hygiene.
- All 22 changed Python files in this change set were formatted using `black` to ensure 100% compliance with `ci.yml`'s `black --check` step on changed files.

## 7. Local Quality Gate Execution Results

### Backend Quality Gates:
- `python -m ruff check .`: **PASS — All checks passed!**
- Changed Python files formatting (`black --check`): **PASS — All 22 changed files compliant.**
- Pytest suite (`pytest -q`): **PASS — 426 passed in 185.40s**.
- Alembic head verification (`alembic heads`): **PASS — Single head 6a4c9e2f1b70**.
- Alembic check (`alembic check`): **PASS — Exit code 0**.

### Frontend Quality Gates:
- `npm run typecheck`: **PASS — Exit code 0**.
- `npm run lint`: **PASS — Exit code 0**.
- `npm test -- --run`: **PASS — 24/24 passed in 451ms**.
- `npm run build`: **PASS — Built in 1.49s** (Vite warning for 1.37MB chunk noted as existing bundle debt).

### Automated Acceptance Results (Playwright/Chromium):
- `npm run test:e2e`: **PASS — 10/10 passed** (Pre-flight health, Admin Login, Protected APIs, Scoped Assignees, Task Drawer stale-state protection, Minimal Task 201, Non-member 409 Conflict, Consecutive Task 201, Token Refresh).
- Console errors: 0
- Unexpected network errors: 0
- Environment: Local MSSQL isolated test database.

### Redis Availability:
- Redis was offline during local verification; the application operated using its built-in memory/fallback cache path without errors.

## 8. Git Commit & Remote CI Verification Results

- **Feature Branch:** `fix/project-relationship-migration`
- **Feature Commit SHA:** `7d70181b5c464efc9ea990ef570fdb0aedec9424`
- **Develop Merge Commit SHA:** `259fd9fb86782c207562037ebe084c6a9c5d3e59`
- **GitHub Actions Workflow:** `CI Foundation`
- **Run ID:** `31069095608`
- **Executed Jobs:**
  1. `Repository Hygiene & Security Gate`: **success**
  2. `Frontend CI (Node 22)`: **success**
  3. `Backend CI (Python 3.12)`: **success**
  4. `Docker Production Hardening Validation`: **success**
- **Final Conclusion:** `success`
- **Execution Time:** ~3 minutes 45 seconds

### Safeguard Confirmations:
- **README Status:** `README.md` and all `README*` files were **UNTOUCHED** (`git diff` empty).
- **Master Branch Status:** `master` branch remains unchanged (`git log -1` matches origin/master).
- **Live Database Status:** Database `TaskSyncEnterprise` was **NOT migrated** (remains at revision `05252bd1d012`).

## 9. Files Changed

- Backend relationship logic: `app/services/project_assignment.py`, `app/services/project_access.py`, `app/services/task_service.py`, `app/crud/task.py`, `app/routers/v1/projects.py`, `app/models/project.py`, `app/models/project_member.py`.
- Migration: `backend/alembic/env.py`, `backend/alembic/versions/6a4c9e2f1b70_align_project_relationship_constraints.py`.
- Diagnostic script: `backend/scripts/diagnose_project_relationships.py`.
- Seed logic: `backend/Seed_Example.py`, `backend/app/seeds/seed_runner.py`, `backend/app/seeds/seed_teams.py`, `backend/app/seeds/seed_employees.py`, `backend/app/seeds/seed_projects.py`, `backend/app/seeds/seed_tasks.py`.
- Backend tests: `backend/tests/test_project_organization.py`, `backend/tests/test_agile_workflow.py`, `backend/tests/test_audit_websocket_employee_guards.py`, `backend/tests/test_seed_dataset_integrity.py`, `backend/tests/test_stabilization_contracts.py`, `backend/tests/test_task_create_manual_regression.py`.
- Frontend: `frontend/src/api/services.ts`, `frontend/src/hooks/useProjects.ts`, `frontend/src/hooks/useNotifications.ts`, `frontend/src/components/drawers/TaskDrawer.tsx`, `frontend/ui-contract.test.mjs`, `frontend/e2e/run-acceptance.mjs`.
- Documentation: `docs/reports/PROJECT_RELATIONSHIP_MIGRATION_FIX_REPORT.md` (this report). No README or CHANGELOG modified.

## 10. Remaining Risks

- **Live Database Remediation:** The live database contains 103 pre-existing relationship inconsistencies. Data remediation must be executed before applying revision `6a4c9e2f1b70` to the production database.

# TaskSyncEnterprise — Enterprise Development Roadmap & Planning

This roadmap maps every issue identified in the **Project Discovery Report** into a structured, dependency-aware implementation plan. It categorizes the issues by layer and severity, establishes the execution graph, and defines operational metrics for all future development phases.

---

## 1. Issue Categorization Matrix

| Issue ID | Description | Severity | Target Phase | Primary Domains |
|---|---|---|---|---|
| **ISS-01** | Missing packages in `requirements.txt` (`python-jose`, `email-validator`, `httpx`). | **Critical** | Phase 1 | Testing, Backend |
| **ISS-02** | RCE upload vulnerability in `StorageService.save_attachment`. | **Critical** | Phase 1 | Security, Backend |
| **ISS-03** | Local Storage JWT cookie token storage. | **Critical** | Phase 1 | Security, Frontend |
| **ISS-04** | SQLite test engine schema crash (`dbo` prefix support mismatch). | **Critical** | Phase 1 | Testing, Database |
| **ISS-05** | Standalone test files named `test_*.py` triggering pytest discovery crashes. | **High** | Phase 1 | Testing |
| **ISS-06** | Database `created_at` fields using local time `GETDATE()` instead of UTC `SYSUTCDATETIME()`. | **High** | Phase 2 | Database |
| **ISS-07** | Duplicate model declarations and dead code inside `app/models/core.py`. | **High** | Phase 2 | Backend, Documentation |
| **ISS-08** | Seed data mismatch in `seed_v2.py` (missing task records and manager users). | **Medium** | Phase 2 | Database, Documentation |
| **ISS-09** | Task details lookup IDOR (`GET /api/v1/tasks/{id}` lacks assignment checks). | **Medium** | Phase 1 | Security, Backend |
| **ISS-10** | Manager actions bypass verification on projects/tasks updates (`PUT`/`DELETE`). | **Medium** | Phase 1 | Security, Backend |
| **ISS-11** | Layout remounting bottleneck (MainLayout remounts on every router transition). | **Medium** | Phase 3 | Frontend |
| **ISS-12** | Incomplete legacy SQLAlchemy model configurations (`vacation.py`, `notification.py`, `audit.py`). | **Medium** | Phase 2 | Database, Backend |
| **ISS-13** | Unused TanStack React Query library dependency in frontend components. | **Low** | Phase 3 | Frontend |
| **ISS-14** | `POST /auth/logout` endpoint relies on insecure oauth2_scheme instead of current user. | **Low** | Phase 1 | Security, Backend |

---

## 2. Dependency Graph

This flowchart defines the logical order of operations required to execute the remediation phases without creating regressions or blocker states:

```
[Remediation Stage 1: Setup & Environment]
  │
  ├── ISS-01: Install Missing Packages (python-jose, email-validator, httpx)
  │     ▼
  ├── ISS-04: Strip 'dbo' Schema during SQLite Test runs
  │     ▼
  └── ISS-05: Rename non-unit-test script files
        │
        ▼
[Remediation Stage 2: Security & IDOR Safeguards]
  │
  ├── ISS-02: Enforce Upload File Restrictions (RCE Protection)
  ├── ISS-03: Transition Token Cache to HTTPOnly Cookies
  ├── ISS-09: Add Task Assignment check on GET route
  ├── ISS-10: Restrict Project updates to Assigned Owner/Managers
  └── ISS-14: Secure Logout authentication checks
        │
        ▼
[Remediation Stage 3: Database & Models Clean-up]
  │
  ├── ISS-07: Delete Dead Code file core.py
  ├── ISS-12: Refactor Legacy Models to modern Mapped column structure
  ├── ISS-06: Adjust local GETDATE() to UTC SYSUTCDATETIME()
  └── ISS-08: Re-seed database with correct Tasks & Manager accounts
        │
        ▼
[Remediation Stage 4: Frontend Layout & Data Fetching]
  │
  ├── ISS-11: Refactor AppRouter layout routing nested Outlets
  └── ISS-13: Refactor Fetch triggers from useEffect to React Query
```

---

## 3. Future Phases Roadmap

---

### PHASE 1: Core Setup, Testing & Security Remediation
*   **Severity Tier:** **Critical / High**
*   **Estimated Complexity:** **Medium** (Standard refactoring of routes, dependencies, and token configurations).

#### Objective
Repair the testing infrastructure, install missing environment dependencies, secure the file upload pipeline, block IDOR/authorization bypass vectors, and move token storage to secure cookies.

#### Files & Modules
*   **Backend Configurations:** `backend/requirements.txt`, `backend/tests/conftest.py`.
*   **Testing Scripts:** `backend/tests/test_my_tasks_http.py` (rename/refactor), `backend/tests/test_stress.py` (rename/refactor).
*   **Security & Services:** `backend/app/services/storage_service.py`, `backend/app/routers/v1/tasks.py`, `backend/app/routers/v1/projects.py`, `backend/app/routers/v1/auth.py`.
*   **Frontend Authentication:** `frontend/src/api/axios.js`, `frontend/src/services/tokenService.js`.

#### Acceptance Criteria
*   The backend application starts up successfully on clean checkouts without manual `uploads` directory creation.
*   Pytest unit testing suite executes cleanly (`pytest tests/`) with zero database schema errors.
*   File attachments with invalid extensions (e.g. `.exe`, `.py`, `.html`) are rejected by the upload service with status `400 Bad Request`.
*   JWT Access and Refresh tokens are transmitted via secure `HttpOnly` cookies instead of localStorage.
*   Standard employees receive `403 Forbidden` if they try to fetch task details (`GET /tasks/{id}`) for tasks they are not assigned to.
*   Managers receive `403 Forbidden` when attempting to edit (`PUT`) or delete (`DELETE`) projects they are not members/creators of.

#### Testing Requirements
*   **Automated Tests:** Execute the unit tests suite `pytest tests/`.
*   **Security Scans:** Run `python backend/tests/security_sweep.py` and verify zero unsecured endpoint alerts.
*   **Manual Verification:** Attempt to upload malicious `.html` files via task attachments and verify upload block. Inspect Chrome DevTools application tab to ensure localStorage tokens are empty.

#### Review Checklist
*   [ ] Do all Pydantic schemas and endpoints use strict type annotations?
*   [ ] Are cookies configured with `httponly=True`, `secure=True`, and `samesite="lax"`?
*   [ ] Are task assignments checked on all task retrieval endpoints?

#### Definition of Done
*   All tests pass. Requirements file contains all packages. Security vulnerabilities (RCE, XSS local storage caching, IDORs) are remediated. PR merged into `develop` without conflicts.

---

### PHASE 2: Database Harmonization & Model Clean-up
*   **Severity Tier:** **High / Medium**
*   **Estimated Complexity:** **Low** (Mainly file deletion and SQL model class modifications).

#### Objective
Standardize declarative models to SQLAlchemy 2.x conventions, remove duplicated models, align database timestamps to UTC default values, and fix the seed data.

#### Files & Modules
*   **Models:** `backend/app/models/core.py` (DELETE), `backend/app/models/vacation.py` (MODIFY), `backend/app/models/notification.py` (MODIFY), `backend/app/models/audit.py` (MODIFY).
*   **Migrations:** `backend/alembic/versions/` (New migration script).
*   **Database Seeding:** `backend/seed_v2.py`.

#### Acceptance Criteria
*   File `backend/app/models/core.py` is removed.
*   Legacy files (`vacation.py`, `notification.py`, `audit.py`) are refactored to use standard SQLAlchemy 2.0 `Mapped` and `mapped_column` declarations.
*   All datetime defaults for model audits utilize `SYSUTCDATETIME()` in SQL Server schema generation.
*   Seed script `seed_v2.py` populates the IT department, 3 system roles, 1 admin, 1 manager, 1 employee, and 1 project populated with 3 task records as described in README.

#### Testing Requirements
*   Run database migrations upgrade test: `alembic upgrade head`.
*   Run migration checks: `alembic check` to verify no model-schema mismatches.
*   Run the seed script: `python seed_v2.py` and query database to verify all records are created correctly.

#### Review Checklist
*   [ ] Are all legacy `Column(...)` usages replaced by modern `mapped_column` models?
*   [ ] Does the database migration execute and roll back without errors?
*   [ ] Are all newly created default datetimes mapped to `SYSUTCDATETIME()`?

#### Definition of Done
*   Codebase has zero occurrences of `Column(...)` in database models. Core.py is deleted. Alembic check passes. Seed data matches requirements.

---

### PHASE 3: Frontend Layout & Data Fetching Optimization
*   **Severity Tier:** **Medium / Low**
*   **Estimated Complexity:** **High** (Requires restructuring the frontend router layout structure and converting all state fetching logic).

#### Objective
Refactor React Router to eliminate sidebar/layout remounting, prevent redundant API calls on page transitions, and replace manual useEffect-based data fetching with TanStack React Query.

#### Files & Modules
*   **Routing:** `frontend/src/router/AppRouter.jsx`.
*   **Layouts:** `frontend/src/layouts/MainLayout.jsx`.
*   **Pages:** All files under `frontend/src/pages/` (Dashboard, Projects, Tasks, etc.).

#### Acceptance Criteria
*   Navigating between routes (e.g. from Dashboard to Projects) preserves sidebar state and does not trigger sidebar re-renders or unmount cycles.
*   Duplicate sidebar API requests are eliminated. The frontend calls `/projects`, `/tasks`, and `/employees` once on load, and synchronizes state in the background via React Query caching.
*   All manual `useEffect` and `useState` Axios calls inside page files are replaced with `@tanstack/react-query` hooks (`useQuery` and `useMutation`).

#### Testing Requirements
*   **Performance Monitoring:** Open browser network tab, click through navigation tabs, and verify only page-specific data is fetched.
*   **Build Integrity:** Run `npm run build` and ensure the bundle compiles with zero syntax warnings.
*   **UI Quality Scan:** Perform visual smoke checks on theme switches and drag-and-drop state switches.

#### Review Checklist
*   [ ] Is `MainLayout` declared as the parent layout in React Router using `<Outlet />`?
*   [ ] Are staleTime and cacheTime configured globally in QueryClient settings?
*   [ ] Are all input mutation operations utilizing the `useMutation` hook?

#### Definition of Done
*   Frontend router matches nested layout patterns. Redundant sidebar API fetches are resolved. Components use TanStack React Query for data sync. Eslint and build checks pass.

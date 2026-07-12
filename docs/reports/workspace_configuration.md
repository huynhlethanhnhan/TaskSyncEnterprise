# TaskSyncEnterprise — Workspace Configuration & Project Standards

This document establishes the official technical standards, architectural patterns, coding guidelines, database standards, workflows, and quality benchmarks for the **TaskSyncEnterprise** platform. All developers and AI agents must strictly adhere to these standards across all phases of implementation.

---

## 1. Project Overview

**TaskSyncEnterprise** is a secure, enterprise-grade Human Resource Management (HRM) and Project Management integration platform. The system is designed to streamline corporate workflows by combining employee directory management, department/team organization, role-based access control (RBAC), vacation tracking, project scoping, real-time notifications, audit logs, and interactive project/task boards.

### Core Modules
*   **Authentication & Security:** JWT-based stateless authentication with automatic token refreshing, credentials blacklisting, and fine-grained Role-Based Access Control (RBAC) (Admin, Manager, Employee).
*   **Dashboard & Analytics:** Consolidated stats, project timelines, pending deadlines, and data visualizations (Kanban tracking, progress percentages).
*   **HRM Core:** Manage profiles, departments, active teams, job titles, and hierarchies.
*   **Vacation & Leave Management:** Leave requests creation, workflow statuses (Pending, Approved, Rejected), and review controls.
*   **Project & Task Management:** Project scoping, project member assignments, task assignment, check-lists, comments, and task files/attachments management.
*   **Audit Logging:** Global tracking of database modifications and critical system activities.
*   **Notifications:** Event-driven, real-time alerts upon task assignments, status updates, or leave reviews.

---

## 2. Technology Stack

The platform is constructed using the following core technologies:

| Layer | Component | Version / Spec | Description |
|---|---|---|---|
| **Backend** | FastAPI | `0.110.0+` | High-performance asynchronous ASGI python web framework. |
| **ORM** | SQLAlchemy | `2.x` | Modern declarative mappings (`Mapped`, `mapped_column`) with SQL Server specific functions. |
| **Driver** | PyMSSQL | `2.x` | Python DB-API driver for Microsoft SQL Server. |
| **Database** | SQL Server | `2019+` (Express/Prod) | Enterprise database utilizing Windows Authentication (local dev) or credentials (prod). |
| **Frontend** | React | `19.x` | Modern UI library with state management and functional components. |
| **Styling** | TailwindCSS | `4.x` | Custom atomic utility classes integrated via `@tailwindcss/vite` plugin. |
| **Routing** | React Router Dom | `7.x` | Declared SPA routes wrapped with guards and layout patterns. |
| **Client** | Axios & React Query | `Axios 1.18.x`, `React Query 5.x` | Promise-based HTTP client and server state synchronization library. |
| **Deployment**| Docker | Standard | Containerization configurations for backend, frontend, and SQL Server. |

---

## 3. System Architecture

The project implements a decoupled Client-Server architecture utilizing a RESTful JSON API layer:

```mermaid
graph TD
    subgraph Client Layer (SPA)
        ReactRouter["React Router v7 (AppRouter)"]
        MainLayout["MainLayout (3-Column layout)"]
        ReactQuery["React Query (Server State Sync)"]
        AxiosClient["Axios HTTP client"]
    end

    subgraph API Layer (Backend)
        FastAPIMain["FastAPI (app/main.py)"]
        Middleware["Logging & CORS Middleware"]
        AuthDeps["RBAC Security Guards (RequireManager, etc.)"]
        RoutersV1["v1 Routers (auth, tasks, etc.)"]
    end

    subgraph Service & Data Access Layer
        Services["Services (Storage, Auth, Audit)"]
        CRUD["CRUD Repositories (crud/team.py, etc.)"]
        SQLAlchemyORM["SQLAlchemy 2.0 ORM Engine"]
    end

    subgraph Storage Layer
        SQLServer[("MS SQL Server (dbo schema)")]
        DiskStorage["Static Uploads (uploads/)"]
    end

    ReactRouter --> MainLayout
    MainLayout --> ReactQuery
    ReactQuery --> AxiosClient
    AxiosClient -- "HTTP REST /api/v1 (JWT)" --> FastAPIMain
    FastAPIMain --> Middleware
    Middleware --> AuthDeps
    AuthDeps --> RoutersV1
    RoutersV1 --> Services
    RoutersV1 --> CRUD
    CRUD --> SQLAlchemyORM
    Services --> DiskStorage
    SQLAlchemyORM -- "pymssql (Port 1433)" --> SQLServer
```

---

## 4. Coding Standards

### Backend (Python/FastAPI)
*   **PEP 8 Compliance:** All Python files must adhere to standard formatting guidelines (4-space indentation, 88-character line limit for Black formatter compatibility).
*   **Type Hinting:** Fully specify function signatures and variables using type hints. Always utilize typing constraints (e.g., `Optional[int]`, `Session = Depends(get_db)`, `Generator`).
*   **Asynchronous Operations:** Implement async endpoints using `async def` and `await` for I/O operations (e.g., file saving, network operations) if applicable. For blocking database operations running under a standard sync SQLAlchemy engine, define standard `def` routes to allow FastAPI to process them inside its threadpool.
*   **Exception Handlers:** Do not use generic `try-except` blocks without structured logs. Catch specific exceptions, return standard HTTP Status Codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`), and raise Pydantic-friendly `HTTPException` validation errors.

### Frontend (JavaScript/React)
*   **Functional Components:** Use functional React components with standard ES6 syntax. Do not mix class components.
*   **Prop Validation:** Utilize TypeScript or descriptive default properties where appropriate.
*   **React Router:** Keep routes nested cleanly inside `AppRouter.jsx`. Protect private routes with `<ProtectedRoute>`.
*   **Styling Consistency:** Implement layout structure and customized dark/light variations strictly within `src/index.css`. Tailor interactive classes using TailwindCSS utility styles. Avoid styling inline; use classes instead.
*   **State Management:** Leverage `@tanstack/react-query` for fetching and mutating server-side data. Use React hook states (`useState`, `useReducer`) exclusively for ephemeral client-side UI states.

---

## 5. Folder Structure Standards

The project workspace maintains two isolated main root folders: `backend/` and `frontend/`.

### Backend Folder Structure
```
backend/
├── alembic/                # Database migrations
│   └── versions/           # Migration history scripts
├── app/
│   ├── core/               # App configuration, security rules, dependencies, and middlewares
│   │   ├── constants.py
│   │   ├── deps.py         # Auth guards, database retrieval
│   │   ├── enums.py
│   │   ├── errors.py
│   │   └── middleware.py
│   ├── crud/               # Raw database interactions (query builders)
│   ├── models/             # SQLAlchemy model definitions (declaring schema tables)
│   ├── repositories/       # Base Repository wrappers
│   ├── routers/            # FastAPI Endpoint registration controllers
│   │   └── v1/             # API Router namespaces
│   ├── schemas/            # Pydantic data validation schemas
│   ├── services/           # Custom business logic services (file upload, auditing)
│   ├── utils/              # Helper utilities (pagination helpers)
│   ├── config.py           # Settings loader
│   ├── database.py         # SQLAlchemy engine & session initialization
│   └── main.py             # FastAPI entrypoint
├── uploads/                # Directory for static user-uploaded files
├── alembic.ini             # Alembic migration configuration
├── requirements.txt        # Python package manager file
└── seed_v2.py              # Initial database seed script
```

### Frontend Folder Structure
```
frontend/
├── public/                 # Static assets
├── src/
│   ├── api/                # HTTP clients, instance configuration (axios setup)
│   ├── components/         # Reusable atomic UI components (buttons, badges)
│   │   ├── notifications/  # Notification widgets
│   │   └── tasks/          # Kanban blocks, check-lists
│   ├── layouts/            # Master layout systems (MainLayout)
│   ├── pages/              # Routed full pages (DashboardPage, ProjectPage)
│   │   ├── audit/
│   │   ├── auth/
│   │   └── ...
│   ├── router/             # Router declarations & ProtectedRoute rules
│   ├── services/           # Client business layers (JWT decoder, storage cache)
│   ├── utils/              # Helper formatters (date conversion, sorting)
│   ├── App.jsx             # React entry wrapper
│   ├── index.css           # Global custom classes, themes, Tailwind variables
│   └── main.jsx            # SPA bootstrap script
├── eslint.config.js        # ESLint project linter configuration
├── package.json            # Node package configurations
└── vite.config.js          # Vite compilation settings
```

---

## 6. API Design Standards

All API routes follow RESTful resource conventions under the base namespace `/api/v1`.

### Endpoint Formatting Guidelines
*   **Plural Nouns:** Keep route prefixes pluralized (e.g., `/api/v1/tasks`, `/api/v1/employees`).
*   **Path Variables:** Reference specific resource instances using integers or UUIDs in the path (e.g., `/api/v1/tasks/{task_id:int}`).
*   **HTTP Methods:** Match operations to correct HTTP request types:
    *   `GET` - Read collections or single items.
    *   `POST` - Create new resources.
    *   `PUT` - Replace existing items entirely.
    *   `PATCH` - Apply partial updates.
    *   `DELETE` - Mark resource as deleted.

### Standard Response Envelope
All collections returned by the backend should either represent list outputs directly mapped to schemas (for simple sets) or implement pagination:
*   **Pagination Metadata:** Pages must be parsed through the globally configured settings:
    ```json
    {
      "items": [...],
      "total": 120,
      "page": 1,
      "size": 20,
      "pages": 6
    }
    ```
*   **Consistency:** Errors should return an structured payload:
    ```json
    {
      "detail": "Descriptive message regarding validation or server failure."
    }
    ```

---

## 7. Database Standards

The project utilizes **Microsoft SQL Server** running under `dbo` as the default schema.

### SQLAlchemy Mapping Rules
*   **Naming Conventions:** 
    *   Table names: Plural, snake_case (e.g., `roles`, `employees`, `task_assignments`).
    *   Columns: Lowercase, snake_case (e.g., `role_name`, `date_of_birth`).
*   **Declaring Relations:** Always use standard typing structures `Mapped` and `mapped_column` to declare attributes. Use `server_default` defaults wherever database-side validation is required (e.g., `server_default=text("SYSUTCDATETIME()")` or `server_default=text("0")` for booleans).
*   **Audit Integration:** Tables capturing actions or transactional objects (like `Project`, `Task`, `Employee`) should inherit from `AuditMixin` (`app/models/mixins.py`) to support audit tracing and soft deletion state management automatically.

### Database Operations
*   **Soft Deletion:** Under no circumstances should backend API logic execute standard SQL `DELETE` queries on entities inheriting from `AuditMixin`. Instead, set `is_deleted = True`, record `deleted_at = datetime.utcnow()`, and keep historical references intact.
*   **Migrations:** Schema modifications must always be declared using Alembic:
    ```bash
    alembic revision --autogenerate -m "description of migration"
    alembic upgrade head
    ```

---

## 8. Git Workflow

We adopt a structured feature-branch workflow to organize work cycles:

```
                  ┌─ feature/phase-01-discovery (Active)
                  │
[master] ─────── [develop] ───────────────────────► [Release QA]
                  │
                  └─ bugfix/issue-322-login-loop
```

### Branches
*   `master`: Reflects active production code. Only merged from `develop` during release stages.
*   `develop`: The central integration branch. All feature branches must branch off of and merge back into `develop`.
*   `feature/phase-XX-name`: Branches targeting specific task batches or architectural phases.
*   `bugfix/issue-XX-desc`: Short-lived branches focusing on isolating and resolving specific test/production bugs.

### Commit Guidelines (Conventional Commits)
All commit messages must follow standard rules:
*   `feat: add task attachment upload endpoint`
*   `fix: resolve null check exception in vacation router`
*   `docs: update folder structure guidelines in AGENTS.md`
*   `refactor: optimize query in tasks crud module`

---

## 9. AI Collaboration Workflow

To maintain code quality and prevent logic regressions when working with AI agents, the following patterns are enforced:

*   **Read Before Research:** Always read this workspace configuration and current code before planning or modifications.
*   **Non-Interactive Execution:** Propose shell commands with proper switches (e.g., `-y`, `-f`, `--force`) to prevent blocking tasks or requiring interactive user prompts.
*   **No Placeholders:** Never output partial code blocks or write placeholder logic. Ensure all code edits are functionally complete.
*   **Step-by-Step Validation:** Run linting sweeps and execute tests immediately after edits to prove changes did not break the build.

---

## 10. Code Review Checklist

Reviewers (both AI and human architects) must verify the following checkpoints before approving a Pull Request:

### Checkpoints
*   [ ] **FastAPI Router Security:** Are routes properly protected by security dependencies (`RequireEmployee`, `RequireManager`)?
*   [ ] **SQL Server Formatting:** Are default timestamps declared using SQL Server syntax (e.g., `SYSUTCDATETIME()`)?
*   [ ] **Unicode String Safeness:** Are default string values mapped securely to NVARCHAR/NTEXT using `N'Value'` literals where necessary?
*   [ ] **Audit & Soft Delete:** Does the model inherit from `AuditMixin`? If so, does the CRUD interface utilize soft deletion rules?
*   [ ] **Pydantic Validation:** Are Pydantic schemas utilizing strict typing?
*   [ ] **Tailwind Styling:** Are CSS overrides implemented properly using global rules rather than inline CSS hacks?
*   [ ] **No Obsolete Assets:** Are temporary testing files cleaned up?

---

## 11. Testing Strategy

Code modifications must be verified through automated tests:

### Test Suite Structure
```
backend/tests/
├── conftest.py                   # Pytest fixtures (DB transaction setup, auth clients)
├── test_auth_rbac.py             # RBAC testing controls
├── test_deps.py                  # Dependencies validation
├── test_e2e_flow.py              # End-to-end user scenarios
├── test_my_tasks_http.py         # HTTP specific endpoint assertions
└── security_sweep.py             # Static vulnerability scanner
```

### Commands
*   **Backend Pytest Execution:** Run tests to verify backend changes:
    ```bash
    cd backend
    pytest tests/
    ```
*   **Database Migration Verification:** Ensure Alembic migration files are clean and error-free:
    ```bash
    alembic check
    ```

---

## 12. Definition of Done (DoD) per Phase

Each milestone or feature phase is only complete when it meets the following Definition of Done criteria:

### Phase 1: Discovery & Design
*   Requirements fully reviewed.
*   System models and API contracts drafted.
*   Schema changes described in architectural plan.

### Phase 2: Database Migration
*   Alembic migration script generated.
*   Migration runs cleanly locally via `alembic upgrade head`.
*   Rollback checks complete (`alembic downgrade`).
*   Seed data script updated to reflect schema changes.

### Phase 3: Core API Backend Implementation
*   Pydantic schemas created for requests, responses, and validation rules.
*   FastAPI routers registered inside `app/main.py`.
*   CRUD query patterns tested and optimized.
*   Auth/RBAC validation guards implemented.
*   All unit tests pass.

### Phase 4: Frontend Component Assembly
*   Components created with clean markup and TailwindCSS v4 formatting.
*   State management handled via Axios API requests and React Query caching.
*   Responsive layouts verified for mobile, tablet, and desktop views.
*   Lint check passes (`npm run lint`).

### Phase 5: Integration & Production Readiness
*   End-to-End API queries verified between client and database.
*   Error handling, invalid authentication, and slow connection feedback tested.
*   All test runs pass.
*   All code conforms to the code style checklist.
*   Pull requests merged without merge conflicts.

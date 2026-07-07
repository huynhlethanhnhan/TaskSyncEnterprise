# TaskSyncEnterprise — Enterprise Development Standards Handbook

This handbook defines the official development standards, architectural policies, code formatting guidelines, and operational standards for all contributors (developers and AI agents) working on the **TaskSyncEnterprise** repository.

---

## 1. Folder Structure Standards

The repository is structured to separate concerns between the server backend, client frontend, database migrations, and project documentation.

```
TaskSyncEnterprise/
├── .agents/                    # Workspace-scoped agent customization rules
├── backend/                    # FastAPI python web application
│   ├── alembic/                # Database migrations history & settings
│   ├── app/
│   │   ├── core/               # System configurations, security filters, dependencies, errors
│   │   ├── crud/               # Raw database interactions (SQL queries & ORM execution)
│   │   ├── models/             # Declarative SQLAlchemy models
│   │   ├── repositories/       # Generic data repository pattern classes
│   │   ├── routers/            # HTTP routers split by version namespaces
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # External integration logic (storage, token service)
│   │   └── utils/              # Help modules (pagination converters, calculations)
│   ├── tests/                  # Backend unit, integration, and security tests
│   └── uploads/                # Directory for static user-uploaded files
├── frontend/                   # React Vite single page application
│   ├── public/                 # Raw public static assets
│   └── src/
│       ├── api/                # Axios instance client config
│       ├── components/         # Reusable presentation components
│       ├── layouts/            # Page structures and navigation frames
│       ├── pages/              # Routed full pages
│       ├── router/             # React Router routing definition and security guards
│       ├── services/           # JWT decoding and access tokens caching
│       └── utils/              # UI formatters (dates, durations)
└── docs/                       # Project specifications, system designs, and schemas
```

---

## 2. Naming Conventions

Consistency in naming ensures readability and maintainability. The following rules are mandatory:

| Asset | Case Pattern | Example | Guidelines |
|---|---|---|---|
| **Python Files** | `snake_case` | `auth_service.py` | Descriptive name matching core concern. |
| **JS/JSX Files** | `PascalCase` or `camelCase` | `TaskPage.jsx`, `time.js` | Components use PascalCase; utility helpers use camelCase. |
| **Python Classes** | `PascalCase` | `AuthService`, `Role` | No underscores, nouns only. |
| **Interfaces (JS)** | `PascalCase` | `IUserSession` | Prepend with `I` only if defining abstract typings. |
| **DTOs / Schemas** | `PascalCase` | `TaskCreate`, `EmployeeResponse` | Suffix indicates purpose (e.g., `Create`, `Update`, `Response`). |
| **API Routes** | `kebab-case` | `/api/v1/change-password` | Lowercase, separated by hyphens. Plural nouns for resource roots. |
| **Database Tables** | `snake_case` | `task_assignments` | Pluralized, matching logical context. |
| **SQL Primary Keys** | `snake_case` | `id` | Standardized to `id` across all tables. |
| **SQL Foreign Keys**| `snake_case` | `employee_id` | Singled parent table name + `_id`. |
| **SQL Indexes** | `snake_case` | `ix_dbo_employees_email` | Format: `ix_[schema]_[table]_[columns]`. |
| **React Components**| `PascalCase` | `NotificationPanel.jsx` | Matches the filename exactly. |

---

## 3. API Standards

### REST Route Design
*   **Plural Naming:** Use plural nouns for resources (e.g., `/api/v1/projects`).
*   **Hierarchical Paths:** Define sub-resources hierarchically (e.g., `/api/v1/tasks/{task_id}/comments`).
*   **HTTP Methods:**
    *   `GET` - Retrieve a collection or specific item (idempotent, no side effects).
    *   `POST` - Create a new resource.
    *   `PUT` - Replace a resource completely.
    *   `PATCH` - Apply partial updates.
    *   `DELETE` - Soft delete a resource.

### HTTP Status Codes
*   `200 OK` - Request completed successfully.
*   `201 Created` - Resource created successfully (response contains the new item).
*   `204 No Content` - Operation completed, returning no body (e.g., delete).
*   `400 Bad Request` - Client-side validation failure or syntax error.
*   `401 Unauthorized` - Authentication required or token expired.
*   `403 Forbidden` - User has valid credentials but lacks permission (RBAC check).
*   `404 Not Found` - Requested resource does not exist.
*   `422 Unprocessable Entity` - Pydantic validation failure.
*   `500 Internal Server Error` - Unhandled exceptions.

### Standard Response Envelope
All non-paginated API responses return the object directly mapped to the target schema.
For paginated collections, wrap the array in the standard envelope:
```json
{
  "items": [],
  "total": 12,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

### Error Response Format
All raised errors must return a standard schema containing the error description:
```json
{
  "detail": "Descriptive message stating the cause of the failure."
}
```

### Request Validation
*   All inputs to API endpoints must be validated using Pydantic V2 schemas.
*   Utilize standard field constraints (e.g., `Field(..., min_length=3, max_length=100)`).
*   Raise explicit `HTTPException(status_code=400, detail="...")` for complex business validation failures.

---

## 4. Database Standards (MS SQL Server)

The database runs under Microsoft SQL Server. All schema objects reside in the default `dbo` schema.

### Naming Conventions
*   **Tables:** Plural `snake_case` (e.g., `refresh_tokens`).
*   **Columns:** Singled `snake_case` (e.g., `created_at`, `password_hash`).
*   **Primary Keys:** Named `id` of type `INTEGER` with auto-increment.
*   **Foreign Keys:** Named `[table_name]_id` referencing the target table (e.g., `department_id`).

### Soft Delete & Audit Fields
*   Every business transaction model (e.g., `Employee`, `Project`, `Task`, `Vacation`) must inherit from `AuditMixin`.
*   **Audit Columns:**
    *   `is_deleted`: `Boolean`, default `False` (`server_default=text("0")`).
    *   `deleted_at`: `DateTime`, nullable.
    *   `created_by_id`: `Integer`, nullable, referencing `employees.id`.
    *   `updated_by_id`: `Integer`, nullable, referencing `employees.id`.
    *   `deleted_by_id`: `Integer`, nullable, referencing `employees.id`.
*   **Hard Deletes Prohibited:** Under no circumstances should backend code execute a hard database `DELETE` query on audit-enabled tables. Implement updates setting `is_deleted = True` and writing audit logs.

### SQL Server Datetime
*   All default database timestamps must use SQL Server's UTC function: `server_default=text("SYSUTCDATETIME()")`. Do not use MySQL (`NOW()`) or Postgres (`NOW()`, `CURRENT_TIMESTAMP`) functions.

### Indexing Strategy
*   Declare indexes for columns frequently used in query filters (`WHERE`) or joins (`JOIN`).
*   Always index foreign keys (e.g., `ix_dbo_employees_department_id`).
*   Always index unique columns (e.g., `ix_dbo_employees_email`).

---

## 5. Git Standards

### Branch Naming Conventions
*   `master`: Clean code mirroring production deployment.
*   `develop`: Integration branch where all feature testing occurs.
*   `feature/phase-[ID]-[short-description]`: New features or phase implementations (e.g., `feature/phase-01-discovery`).
*   `bugfix/[issue-number]-[description]`: Fixes targeting bugs (e.g., `bugfix/302-auth-timeout`).

### Commit Message Conventions (Conventional Commits)
Format: `<type>(<scope>): <description>` (scope is optional).
*   `feat`: A new feature implementation.
*   `fix`: A bug fix.
*   `docs`: Documentation changes only.
*   `style`: Code formatting changes (whitespaces, semicolons) without altering logic.
*   `refactor`: Code changes that neither fix a bug nor add a feature.
*   `test`: Adding missing tests or correcting existing tests.
*   `chore`: Updating build scripts, package managers, etc.

### Merge Rules
*   Direct commits to `master` and `develop` are strictly prohibited.
*   All integrations into `develop` must occur via Pull Requests.
*   PRs must pass all static lint checks and unit tests before merging.
*   Require at least one architect approval before merging to `develop`.

---

## 6. Code Review Checklist

Reviewers must inspect code contributions against the following metrics:

*   [ ] **Type Safety:** Are Python type hints and Pydantic validation rules defined?
*   [ ] **SQL Server Compatibility:** Are default date-times using `SYSUTCDATETIME()`? Are default strings mapped to NVARCHAR using `N'value'`?
*   [ ] **Database Audit Integration:** Are deletion methods soft deleted, updating `is_deleted` and `deleted_at`?
*   [ ] **RBAC Protection:** Are routers guarded with correct dependencies (`RequireEmployee`, `RequireManager`)?
*   [ ] **React Hook Standards:** Are functional hooks (`useState`, `useEffect`) used correctly? Are queries using React Query?
*   [ ] **Styling Overrides:** Are styling customisations placed in `index.css` inside `html.dark` or root selectors instead of inline?
*   [ ] **Code Hygiene:** Are there any console logs, debuggers, or commented-out code blocks left?

---

## 7. Security Checklist

Verify these security settings before deploy:

*   [ ] **JWT Token Safety:** Tokens must have brief access lifetimes (e.g., 60 minutes) and require rotation via blacklisted refresh tokens.
*   [ ] **CORS Configuration:** Do not use wildcard `*` allowed origins in production. Configure specific allowed hosts.
*   [ ] **Static File Sanitation:** File attachments and uploads must use isolated directories (e.g., `uploads/`). File extensions must be verified.
*   [ ] **Password Hashing:** Passwords must be hashed using bcrypt before database insertion.
*   [ ] **SQL Injection Prevention:** All queries must utilize SQLAlchemy's parameterized queries. Avoid raw SQL concatenation.
*   [ ] **XSS Prevention:** Sanitize user text inputs on both frontend output rendering and backend validation.

---

## 8. Testing Standards

### Pytest Execution
*   Tests are located under `backend/tests/`.
*   Use fixtures to handle temporary sqlite/mssql session rollbacks (`conftest.py`).
*   To execute the unit test suite, run:
    ```bash
    cd backend
    pytest tests/
    ```

### Alembic Migration Integrity
*   Ensure that there are no model-migration configuration mismatches:
    ```bash
    alembic check
    ```

---

## 9. Documentation Standards

*   **Docstrings:** Define docstrings for all custom classes, modules, and API route controllers. Use standard Google or Sphinx Python styling.
*   **Pydantic Descriptions:** Provide descriptions for variables in schema fields to document endpoints in Swagger UI:
    ```python
    class TaskCreate(BaseModel):
        title: str = Field(..., description="The main heading of the task")
    ```
*   **Comments:** Write brief comments explaining "why" code was written, not "what" it does. Avoid long paragraphs.
*   **No Obsolete Files:** Remove scratch files, dump scripts, and leftover backup files prior to PR creation.

---

## 10. Definition of Done (DoD)

A task/feature is considered **Done** only when it meets the following parameters:

1.  **Code Quality:** Zero linting errors or compilation warnings. Meets coding conventions.
2.  **Database Integration:** Alembic migration scripts are generated, applied, and verified. Seed script is updated.
3.  **Authorization:** Appropriate role checks applied, preventing unauthorized CRUD.
4.  **Testing Coverage:** Unit tests added for backend business logic. All tests execute successfully.
5.  **Review Verification:** Pull request reviewed, approved, and merged without conflicts.
6.  **Documentation:** All API schema models, README, and configuration documents updated.

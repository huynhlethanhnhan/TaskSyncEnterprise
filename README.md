# TaskSyncEnterprise

**An enterprise-grade project management and workforce coordination platform** built with FastAPI, React 19, and Microsoft SQL Server. TaskSyncEnterprise provides end-to-end task orchestration, agile sprint management, employee self-service portals, real-time notifications, and administrative governance — all within a modern, responsive SaaS-quality interface.

> **Status:** Phase 4.5 complete — enterprise UI/UX redesign, workflow integration, and production hardening finalized. Active development on `develop` branch.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06b6d4)](https://tailwindcss.com/)

---

## Product Overview

TaskSyncEnterprise is a multi-role workforce management platform covering the full lifecycle of enterprise project delivery. It supports three distinct user personas — **Admin**, **Manager**, and **Employee** — each with scoped access enforced both at the API and UI layer.

The platform handles project portfolios, sprint planning, kanban boards, product backlogs, task collaboration, file management, vacation approvals, real-time notifications, team administration, and system audit logs — all backed by a production-ready infrastructure stack with Docker, Redis, SQL Server, Nginx, Prometheus, Grafana, and a GitHub Actions CI/CD pipeline.

---

## Key Features

### Work Management
- **Dashboard** — Live project counts, task statistics, team workload overview, and overdue indicators sourced from real APIs
- **My Work** — Personal workspace showing tasks due today, assigned task groups by project, leave request history, and quick-action shortcuts
- **Projects** — Full project lifecycle with status tracking, code-based identification, and member assignment
- **Tasks** — Assignable tasks with priorities, deadlines, story points, status transitions, and file attachments
- **Kanban Board** — Drag-and-drop task management across To Do, In Progress, Review, and Done columns
- **Product Backlog** — Backlog item management with priority ranking (requires sprint backend extension for full Agile velocity)
- **Sprints** — Sprint creation, item assignment, and progress tracking (sprint snapshot model documented as a known gap)
- **Calendar** — Monthly calendar with approved leave events overlaid as read-only indicators

### Employee Self-Service
- **Vacation Requests** — Multi-step leave submission form with type selection and date range
- **Request History** — Personal leave request timeline with approval status tracking
- **Approval Workflow** — Manager and HR approval chain with full status progression
- **Personal Calendar Integration** — Approved leaves reflected in the shared calendar view

### Collaboration
- **Task Comments** — Threaded comment system on task detail drawers
- **File Attachments** — File upload and management per task via `/tasks/{id}/attachments`
- **Topics** — Discussion topic threads (backend API gap documented)
- **Feedback** — Structured feedback submission (backend API gap documented)
- **Notifications** — Real-time bell popover with unread indicators, date-grouped notification page, and entity deep links
- **Activity** — Project and task activity timeline visible in project detail tabs

### Reporting and Administration
- **Reports** — Computed project portfolio completion rates, task status/priority distributions, employee workload tables, and vacation summaries with CSV export (formula-injection-safe)
- **Users** — Employee directory with CRUD management (Admin/Manager scoped)
- **Teams** — Team administration with department mapping, team codes, and CRUD drawers
- **Roles and Permissions** — Read-only permission matrix in Settings reflecting hardcoded RBAC rules (Admin=1, Manager=2, Employee=3)
- **Audit Logs** — Admin-only system event log with action badges, login counters, and CSV export
- **Settings** — Theme, language, timezone preferences with the permission matrix grid

### Platform Engineering
- **Authentication** — JWT access + refresh token authentication with bcrypt password hashing
- **RBAC** — Role-based access control enforced at both FastAPI dependency and React route level
- **Caching** — Redis caching layer with TTL and pattern-based invalidation
- **Observability** — Prometheus metrics, Grafana dashboards, OpenTelemetry tracing, structured JSON logging
- **Docker** — Development and production Docker Compose configurations with health checks
- **CI/CD** — GitHub Actions pipeline: Ruff, Black, Pytest, Bandit, pip-audit, Hadolint, Docker build
- **Backup and DR** — Automated SQL Server, Redis, and uploads backup with SHA-256 checksums and restore controls
- **Production Hardening** — Nginx reverse proxy, HTTPS-ready, non-root containers, read-only filesystems, secret enforcement

---

## Architecture

```mermaid
graph TD
    Browser["Browser / Client"] --> Nginx["Nginx\n(Reverse Proxy :80/:443)"]
    Nginx --> Frontend["React 19 SPA\n(Vite + TailwindCSS 4)"]
    Nginx --> Backend["FastAPI\n(/api/v1)"]
    Backend --> SQLServer["MS SQL Server 2022\n(Primary Data Store)"]
    Backend --> Redis["Redis 7\n(Cache + Rate Limiting)"]
    Backend --> OTel["OpenTelemetry\n(Traces + Metrics)"]
    OTel --> Prometheus["Prometheus"]
    Prometheus --> Grafana["Grafana\n(Dashboards)"]
```

### Component Summary

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 19, TypeScript, TailwindCSS v4, Vite | SPA, UI, state management |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2.x | REST API, business logic, RBAC |
| Database | Microsoft SQL Server 2022 | Primary relational data store |
| Cache | Redis 7 | Session cache, rate limiting, notifications |
| Proxy | Nginx | TLS termination, SPA routing, API proxy |
| Observability | Prometheus, Grafana, OpenTelemetry | Metrics, dashboards, distributed tracing |
| CI/CD | GitHub Actions | Lint, test, security scan, Docker build |
| Containerization | Docker, Docker Compose | Dev and production orchestration |

---

## Technology Stack

| Component | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.x |
| Frontend language | TypeScript | 5.7.x |
| CSS framework | TailwindCSS | 4.x |
| Build tool | Vite | 8.x |
| State / data fetching | TanStack React Query | 5.x |
| Charts | Recharts | 3.x |
| Backend framework | FastAPI | 0.115.x |
| Backend language | Python | 3.12 |
| ORM | SQLAlchemy | 2.x |
| Migrations | Alembic | — |
| Database | Microsoft SQL Server | 2022 |
| Cache / queue | Redis | 7 |
| Container runtime | Docker + Docker Compose | — |
| Reverse proxy | Nginx | — |
| Metrics | Prometheus | v3.13.1 |
| Dashboards | Grafana | 11.1.0 |
| Tracing | OpenTelemetry | — |
| CI/CD | GitHub Actions | — |

---

## Repository Structure

```
TaskSyncEnterprise/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── models/           # SQLAlchemy 2.x models
│   │   ├── routers/v1/       # API route handlers
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # Business logic layer
│   │   └── core/             # Config, dependencies, security
│   ├── alembic/              # Database migration scripts
│   ├── tests/                # Pytest test suites
│   ├── requirements.txt      # Production dependencies
│   └── requirements-dev.txt  # Development/testing dependencies
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── api/              # Axios clients and API wrappers
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # TanStack Query hooks
│   │   ├── layouts/          # ApplicationShell, MainLayout
│   │   ├── pages/            # Feature page components
│   │   ├── providers/        # Auth, Theme, Toast context
│   │   ├── router/           # React Router configuration
│   │   └── utils/            # Helpers (CSV, cn, permissions)
│   ├── helpers.test.mjs      # Unit tests (Node test runner)
│   └── package.json
├── docs/                     # Technical documentation
│   ├── frontend/             # Design system, component guides
│   ├── testing/              # Manual testing guides
│   └── reports/              # Phase audit and release reports
├── nginx/                    # Nginx configuration
├── monitoring/               # Prometheus and Grafana configs
├── infrastructure/           # Backup and DR scripts
├── docker-compose.yml        # Development Compose
├── docker-compose.production.yml  # Production Compose
├── docker-compose.monitoring.yml  # Monitoring stack Compose
├── .env.example              # Environment variable template
├── .env.production.example   # Production environment template
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Git | 2.x |
| Docker | 24.x |
| Docker Compose | v2.x (plugin) |
| Node.js | 20.x LTS |
| npm | 9.x |
| Python | 3.12 |
| Available RAM | 4 GB (8 GB recommended for SQL Server) |

---

## Environment Configuration

Copy the example environment file before starting:

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```dotenv
ENVIRONMENT=development

# Replace with a strong random secret (minimum 32 characters)
SECRET_KEY=replace-with-your-random-secret-here

# SQL Server SA password — must match MSSQL_SA_PASSWORD below
MSSQL_SA_PASSWORD=YourStrongPassword123!

# Keep synchronized with MSSQL_SA_PASSWORD
DATABASE_URL=mssql+pymssql://sa:YourStrongPassword123!@sqlserver:1433/TaskSyncEnterprise

REDIS_URL=redis://redis:6379/0
PROMETHEUS_BIND_ADDRESS=127.0.0.1
```

> **Never commit real passwords or tokens.** The `.env` file is excluded by `.gitignore`. Use `.env.example` as the committed reference.

For production deployments, see `.env.production.example` for the full variable reference including TLS, email, and secret-strength enforcement.

---

## Quick Start with Docker

### 1. Clone and configure

```bash
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
cp .env.example .env
# Edit .env with your database password and secret key
```

### 2. Start the stack

```bash
docker compose up --build
```

SQL Server requires approximately 30 seconds to initialize on first start. The backend will retry until the database is healthy.

### 3. Apply database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 4. Access the application

| Service | URL |
|---|---|
| Frontend | http://localhost:8000 (proxied via backend Nginx in dev) |
| Backend API | http://localhost:8000/api/v1 |
| API Documentation | http://localhost:8000/docs |
| Alternative docs | http://localhost:8000/redoc |

> **Note:** In the development Compose file, the backend is exposed directly on port 8000. In production Compose, Nginx handles routing on ports 80/443.

### 5. Stop the stack

```bash
docker compose down
```

### 6. View logs

```bash
docker compose logs -f backend
docker compose logs -f sqlserver
```

---

## Local Development

### Backend

```bash
# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

# Install production and development dependencies
pip install -r backend/requirements.txt
pip install -r backend/requirements-dev.txt

# Set up environment
cp .env.example .env
# Edit .env with your local SQL Server connection string

# Apply database migrations
cd backend
alembic upgrade head

# Start the backend development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the development server (hot reload)
npm run dev
```

The frontend dev server starts on http://localhost:5173 and proxies API requests to the backend.

---

## Seeding Development Data

An example seed script is included for local development:

```bash
# Ensure the backend virtual environment is active and database is migrated
cd backend
python Seed_Example.py
```

> **Note:** Do not run seed scripts against a production database. Seed data is for local development only.

---

## Testing

### Frontend

```bash
cd frontend

# ESLint
npm run lint

# TypeScript type checking
npm run typecheck

# Unit tests (Node built-in test runner)
npm run test

# Production build verification
npm run build
```

### Backend

```bash
# Ensure virtual environment is active
cd backend

# Code formatting check
python -m black --check .

# Linting
python -m ruff check .

# Unit and integration tests
pytest tests/ -v

# With coverage report
pytest tests/ --cov=app --cov-report=term-missing
```

### End-to-End Tests

Browser-based E2E tests require a running application instance:

```bash
cd frontend
npm run test:e2e:chrome       # Chrome browser audit
npm run test:e2e:edge         # Edge browser audit
npm run test:e2e:responsive   # Responsive layout test
```

> **E2E environment dependency:** These tests require a running application stack and a configured Playwright browser installation. They cannot run in an isolated CI environment without additional setup.

---

## Monitoring and Observability

The monitoring stack is available as a separate Compose overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up
```

| Service | URL | Purpose |
|---|---|---|
| Prometheus | http://localhost:9090 | Metrics collection and alerting |
| Grafana | http://localhost:3000 | Dashboards and visualization |
| cAdvisor | http://localhost:8080 | Container resource metrics |
| Health (live) | http://localhost:8000/health/live | Liveness probe |
| Health (ready) | http://localhost:8000/health/ready | Readiness probe |
| Health (details) | http://localhost:8000/health/details | Full health details |
| Metrics | http://localhost:8000/metrics | Prometheus scrape endpoint |

---

## Production Deployment

For production deployment, use the production Compose configuration:

```bash
# Copy and fill in the production environment file
cp .env.production.example .env.production
# Edit all required variables including strong secrets

docker compose -f docker-compose.production.yml up -d
```

Key production considerations:
- All backend ports are hidden behind Nginx (public ports: 80, 443 only)
- SSL/TLS certificates mount into `nginx/ssl/` (not committed)
- Secret enforcement rejects weak or default values at startup
- Containers run as non-root users with read-only filesystems
- Named volumes preserve SQL Server and Redis data across restarts

See [`docs/`](docs/) for detailed production, backup, and disaster recovery documentation.

---

## Documentation Index

### Setup
- [Development Setup Guide](docs/) — Local environment and Docker instructions
- [Environment Variables Reference](.env.production.example) — All configurable variables

### Design System and Frontend
- [Design System](docs/frontend/DESIGN_SYSTEM.md) — Token definitions and usage
- [Component Guide](docs/frontend/COMPONENT_GUIDE.md) — Component catalogue
- [Navigation and RBAC](docs/frontend/NAVIGATION_AND_RBAC.md) — Role-based navigation logic
- [Responsive Guide](docs/frontend/RESPONSIVE_GUIDE.md) — Mobile and tablet behavior

### Backend
- [API Documentation](http://localhost:8000/docs) — Live Swagger UI (requires running backend)

### Testing
- [Manual UI Test Guide](docs/testing/PHASE_4_5_MANUAL_UI_TEST_GUIDE.md) — Feature-by-feature testing checklist

### Phase Reports
- [Phase 4.5 UI Foundation Report](PHASE_4_5_UI_FOUNDATION_REPORT.md)
- [Phase 4.5 Product Workspaces Report](PHASE_4_5_PROMPT_2_PRODUCT_WORKSPACES_REPORT.md)
- [Phase 4.5 Final Release Certification](docs/reports/PHASE_4_5_FINAL_RELEASE_CERTIFICATION.md)

### Production and Operations
- [Monitoring Setup](monitoring/) — Prometheus and Grafana configuration
- [Nginx Configuration](nginx/) — Reverse proxy and TLS setup
- [Infrastructure and Backup](infrastructure/) — Backup scripts and DR procedures

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| Phase 3.1–3.8 | Complete | Backend foundation, production hardening, Docker, CI/CD, observability, backup/DR |
| Phase 4 | Complete | Initial React SPA with core CRUD screens |
| Phase 4.5 | Complete | Enterprise UI/UX redesign, design system, workflow integration, reports, admin workspaces |
| Phase 5 | Planned | HR module expansion: payroll, attendance, org chart, advanced leave policies |
| Phase 6 | Planned | AI-assisted features: task assignment suggestions, workload forecasting, anomaly detection |

### Known Limitations (Phase 4.5)

The following features are designed but require backend schema extensions to be fully functional:

- **Sprint burndown charts** — Requires a `sprint_snapshots` history table
- **Topics and Feedback modules** — Frontend gap-screen blueprints exist; backend entity models and API routes not yet implemented
- **Agile velocity metrics** — Requires story point aggregation over sprint timeline snapshots

---

## Security

- **Secrets in Git:** No secrets, passwords, or API tokens should ever be committed. `.env` files are excluded by `.gitignore`. Use `.env.example` and `.env.production.example` as templates.
- **RBAC enforcement:** All sensitive operations are protected at the FastAPI dependency layer using `RequireAdmin`, `RequireManager`, or `get_current_user` guards. Frontend visibility controls supplement but do not replace API-level enforcement.
- **CSV export:** All CSV exports use formula-injection escaping to prevent spreadsheet injection attacks.
- **Reporting security issues:** Open a private GitHub issue or contact the repository maintainer directly. Do not post security vulnerabilities in public issues.

---

## Contributing

1. Fork the repository and create a feature branch from `develop`
2. Run `npm run lint`, `npm run typecheck`, and `npm run test` before submitting
3. Run `python -m black .` and `python -m ruff check .` for backend changes
4. Submit a pull request targeting `develop` — not `master`
5. Include a clear description of the change and reference any related issues

`master` is the stable release branch. All development flows through `develop`.

---

## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 TaskSyncEnterprise Contributors

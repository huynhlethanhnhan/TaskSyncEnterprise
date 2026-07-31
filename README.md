# TaskSyncEnterprise — Enterprise Task & Work Management Platform

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC1-blue.svg)](docs/reports/final_release_candidate_report.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-408%20Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![Frontend Vite](https://img.shields.io/badge/Vite%20Build-Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![Docker Hardened](https://img.shields.io/badge/Docker%20Compose-Hardened-success.svg)](docs/reports/docker_and_ci_stabilization_report.md)
[![CI Pipeline](https://img.shields.io/badge/GitHub%20Actions-Green-brightgreen.svg)](.github/workflows/ci.yml)

## 📌 Executive Product Overview

**TaskSyncEnterprise** is a multi-tenant, role-based enterprise task management platform built for modern agile software development teams. The platform cleanly integrates **Administration Governance** (`Department -> Team -> Employee`) with **Agile Work Management** (`Project -> ProjectMember -> Sprint -> Task -> TaskAssignment -> Board -> Backlog -> Notifications -> Dashboard -> Calendar`).

---

## 📂 Module Structure

```
TaskSyncEnterprise/
├── backend/
│   ├── alembic/              # Alembic database schema migration scripts
│   ├── app/                  # FastAPI routers, models, schemas, services, CRUD
│   │   ├── seeds/            # Deterministic database seeding pipeline
│      ├── core/             # Security, RBAC, JWT, configuration
│      └── main.py            # FastAPI entry point
│   ├── tests/                # Pytest integration & unit test suite (408 passed)
│   ├── entrypoint.sh         # Hardened container startup script (wait, migrate, seed, app)
│   ├── Dockerfile            # Production multi-stage Python 3.12 image
│   └── requirements.txt      # Production Python dependencies
├── frontend/
│   ├── e2e/                  # Playwright E2E browser acceptance suite
│   ├── src/                  # React 19 SPA components, pages, hooks, providers
│   ├── nginx.conf            # Nginx container configuration with reverse proxy rules
│   ├── Dockerfile            # Production multi-stage Node 22 / Nginx image
│   └── package.json          # Node dependencies & Vite build scripts
├── docs/
│   ├── architecture/         # Enterprise business rules & data model docs
│   ├── diagrams/             # Mermaid component, container, ERD & request flow diagrams
│   └── reports/              # Final Release Candidate & CI/Docker reports
├── scripts/
│   └── docker_smoke_test.ps1 # Container stack integration test runner
├── .github/workflows/
│   └── ci.yml                # GitHub Actions CI workflow (Hygiene, Backend, Frontend, Docker)
├── docker-compose.yml        # Development Docker Compose stack
├── docker-compose.production.yml # Hardened Production Docker Compose stack
└── README.md
```

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic (Migrations), PyMSSQL / SQLite.
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query, Lucide Icons.
- **Containers & Reverse Proxy**: Docker, Docker Compose, Nginx 1.27.1, Hadolint.
- **Testing & Quality**: Pytest (Coverage 88%+), Playwright E2E browser runner, Hadolint, Bandit SAST, pip-audit.
- **Database & Cache**: MS SQL Server 2022, Redis 7 (Cache invalidation with graceful in-memory fallback).

---

## 👥 Role Matrix & Access Control

| Role | Administration Scope | Work Manager Scope | System Permissions |
|---|---|---|---|
| **Admin** | Global (Full CRUD on Departments, Teams, Employees) | All Projects, Memberships, Sprints & Tasks | System Settings, Global Audit & Dashboard |
| **Manager** | View-only Department / Team context | Scoped Projects, Member assignment, Sprint lifecycle | Project Dashboard & Member Workload |
| **Employee** | View personal profile & team members | Assigned Projects & Tasks | Personal Kanban Board, Task Status & Progress |

---

## 🏗️ Architecture & Domain Hierarchy

```
Administration Level:
  Department ──(1:N)──> Team ──(1:N)──> Employee

Work Manager Level:
  Project
  ├──(1:1)──> Department (Primary Owning Department)
  ├──(0..1:1)─> Team (Primary Owning Team, must belong to Department)
  ├──(1:N)──> ProjectMember (Constrained by Department/Team rules)
  ├──(1:N)──> Sprint (Derives organization context dynamically via Project)
  └──(1:N)──> Task (Derives organization context dynamically via Project)
              └── Assigned To: ProjectMember (Must be an active ProjectMember)
```

---

## 🚀 Docker Setup & Deployment

### Development Stack (Local Docker Compose)
```powershell
# Copy environment template
Copy-Item .env.example .env

# Edit .env with custom secrets if desired
# Build & start container stack
docker compose up -d --build

# Inspect running container health
docker compose ps

# Run container smoke test automation
.\scripts\docker_smoke_test.ps1

# Shutdown container stack
docker compose down
```

### Production Stack (Hardened Compose)
```powershell
Copy-Item .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

---

## ⚡ Non-Docker Local Setup

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -r requirements-dev.txt

# Run Alembic migrations
python -m alembic upgrade head

# Seed development dataset
python -m app.seeds.seed_runner

# Start Uvicorn backend server
python -m uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup
```powershell
cd frontend
npm ci
npm run dev
```

---

## 🧪 Quality Gates & Automated Acceptance

```powershell
# 1. Backend Pytest Test Suite (408 passed)
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m pytest tests -q

# 2. Frontend Production Build Check
cd ..\frontend
npm run build

# 3. Playwright E2E Browser Acceptance Suite (10/10 Passed)
cd ..
node frontend/e2e/run-acceptance.mjs

# 4. Container Smoke Test Verification
.\scripts\docker_smoke_test.ps1
```

---

## 📊 System Architecture Diagrams

- 📐 [System Component Diagram](docs/diagrams/system_component_diagram.md)
- 🐳 [Container Deployment Diagram](docs/diagrams/container_deployment_diagram.md)
- 🗄️ [Database ERD Diagram](docs/diagrams/database_erd.md)
- 🔄 [Request Flow Sequence Diagram](docs/diagrams/request_flow_diagram.md)

---

## ⚠️ Known Limitations & Roadmap

### Known Limitations
1. **Azure Cloud Infrastructure**: Direct Azure Kubernetes / App Service Terraform modules remain out of scope for pre-August local delivery.
2. **Production SMTP Gateway**: Requires external credentials in `.env` for production email transmission.
3. **Frontend Bundle Warning**: Large chunk warning on single vendor bundle; Vite code splitting optimization is scheduled for v1.1.

### Roadmap
- [x] Administration Stabilization (`Department -> Team -> Employee`)
- [x] Project Organization Context (`department_id` & `team_id`)
- [x] RBAC & Project Member Business Rules
- [x] Alembic-First Database Migration Strategy
- [x] Hardened Docker Container Pipeline & Health Probes
- [x] GitHub Actions Green Foundation CI
- [ ] Azure KeyVault & Managed Identity integration
- [ ] Automated SQL Server backup retention scheduler
- [ ] Advanced analytical reporting dashboard

---

## 📖 Key Documentation Links

- 📋 [Docker & CI/CD Stabilization Report](docs/reports/docker_and_ci_stabilization_report.md)
- 🎯 [Final Release Candidate Report](docs/reports/final_release_candidate_report.md)
- 📘 [Final Manual Acceptance Guide](docs/guides/final_manual_acceptance_guide.md)
- 🐛 [Final Bug Fix Matrix](docs/reports/final_bug_fix_matrix.md)
- 🏢 [Enterprise Business Relationships Architecture](docs/architecture/business_relationships.md)

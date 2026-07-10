# TaskSync Enterprise V2

[![CI/CD Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![FastAPI Version](https://img.shields.io/badge/FastAPI-0.110.0-blue.svg)]()
[![Pydantic Version](https://img.shields.io/badge/Pydantic-v2-blueviolet.svg)]()
[![SQLAlchemy Version](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.12-blue.svg)]()
[![License](https://img.shields.io/badge/license-proprietary-lightgrey.svg)]()

TaskSync Enterprise V2 is a production-ready, enterprise-grade full-stack platform integrating **Human Resource Management (HRM)** and **Project Management** workspaces. Built using a robust, decoupled micro-architecture, it incorporates strict security policies, real-time logging correlation, global exception handlers, automated monitoring probes, and modern type-safe schemas.

---

## 🏛️ Architecture Overview

The system implements a strict **Layered Architectural Design**, decoupling responsibilities across specialized execution layers to ensure high maintainability, SOLID compliance, and clear boundaries:

```
                  [ Client Tier: React SPA ]
                              │
                              ▼ (HTTP/HTTPS)
                    [ API Gateway / Proxy ]
                              │
                              ▼
                [ FastAPI Presentation Layer ]
             (APIRouters ──► Schemas Serialization)
                              │
                              ▼
                   [ Service Logic Layer ]
                (Business Rules & Validations)
                              │
                              ▼
                 [ CRUD Data Abstraction ]
               (Repositories ──► SQL Queries)
                              │
                              ▼
                  [ Relational ORM Models ]
                  (SQLAlchemy 2.0 ──► dbo)
                              │
                              ▼
              [ Database Tier: MS SQL Server ]
```

---

## 🛠️ Technology Stack

### Backend
*   **FastAPI:** High-performance, async-native ASGI web framework.
*   **Pydantic V2:** Type-safe input/output payload validation and settings parsing.
*   **Uvicorn:** Production-grade asynchronous ASGI server.
*   **SQLAlchemy 2.0:** Modern type-annotated mapping declarative ORM.
*   **Alembic:** Database schema migrations version control.

### Frontend
*   **React 19:** Client application framework.
*   **Vite:** High-speed bundler and development tooling.
*   **TailwindCSS v4:** Utility-first CSS layout engine.
*   **TanStack React Query:** Server-side state caching and synchronization.

### Database & Authentication
*   **MS SQL Server:** Primary transactional database engine (Express/Developer).
*   **JWT Bearer Tokens:** Access and refresh token authorization model.
*   **HTTP-Only Cookies:** Secure token caching preventing XSS exploits.

---

## ⚙️ Backend Core Infrastructure Features

*   **Modular Configuration Facade:** Immutable Settings models powered by `pydantic-settings` split into Settings, Constants, and Paths blocks.
*   **Global Exception Filter:** A centralized exception pipeline translating system errors into standard internal error codes while preventing raw SQL schema leaks.
*   **Enveloped Responses:** Generic wrappers (`ApiResponse[T]`, `PagedResponse[T]`) ensuring consistent schema serialization and precise Swagger definitions.
*   **Observability & Logging:** File rotating handlers stamped with ContextVar-based request correlation IDs (`X-Request-ID`).
*   **SRE Health Probes:** Independent `/health/live` (process checks) and `/health/ready` (connectivity tests) HTTP checks.
*   **SQL Performance Timing:** SQLAlchemy listeners capturing slow queries (>500ms) and database connection pool statuses.

---

## 📂 Folder Structure

```text
TaskSyncEnterprise/
├── .vscode/                   # VS Code workspace settings & debug configurations
├── backend/                   # FastAPI backend application
│   ├── alembic/               # Alembic database migrations history
│   ├── app/                   # Application package root
│   │   ├── core/              # Facades, settings, paths, and constants
│   │   ├── database/          # Connection setups and SQL query monitors
│   │   ├── handlers/          # Central global exception middleware handlers
│   │   ├── health/            # Probes logic, checking services, and models
│   │   ├── lifecycle/         # Startup and shutdown boot tasks
│   │   ├── logging/           # Custom formatters, rotating loggers, and context
│   │   ├── middleware/        # Correlation ID request context managers
│   │   ├── monitoring/        # Metrics counters, performance validators, and checkups
│   │   ├── routers/           # API routes definitions and version facades
│   │   ├── schemas/           # Pydantic payloads validation models
│   │   └── utils/             # Helpers (pagination adapters, builders)
│   ├── logs/                  # Application output logs (app.log, error.log, audit.log)
│   └── tests/                 # Pytest integration tests suites
├── frontend/                  # React client application
└── docs/                      # Technical reports, roadmaps, and indexes
```

---

## 🚦 Getting Started & Installation

### Prerequisites
*   Python 3.12+
*   Node.js 18+
*   MS SQL Server (configured on default port 1433)

### 1. Repository Setup
Clone the repository and enter the workspace:
```bash
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
```

### 2. Backend Setup
Create and activate virtual environment inside `backend/`:
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Unix/macOS:
source .venv/bin/activate
```
Install required dependencies:
```bash
pip install -r requirements.txt
```
Configure your environment parameters by creating `backend/.env`:
```env
MSSQL_USER=sa
MSSQL_PASSWORD=YourSecurePassword
MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
SECRET_KEY=task_sync_enterprise_secret_key_chuandry_2026
ENVIRONMENT=development
```
Execute database migrations and seed default records:
```bash
alembic upgrade head
python seed_v2.py
```

### 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd ../frontend
npm install
```
Configure your environment parameters by creating `frontend/.env.development`:
```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

---

## 💻 Running the Application

### Running Backend
Start the FastAPI server via Uvicorn:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
*   **Interactive API Docs:** Navigate to `http://127.0.0.1:8000/docs` (Swagger UI) or `http://127.0.0.1:8000/redoc`.

### Running Frontend
Start the Vite development server:
```bash
cd frontend
npm run dev
```
Navigate to the default client address: `http://localhost:5173`.

---

## 🧪 Testing and Verification

To execute the automated backend test suite, run:
```bash
cd backend
python -m pytest
```

---

## 📊 Observability & Telemetry Endpoints

The backend exposes SRE-compliant diagnostics probes:
*   **Liveness Check (`GET /health/live`):** Verifies the process is alive.
*   **Readiness Check (`GET /health/ready`):** Validates database, storage, and settings loading.
*   **Detailed Diagnostics (`GET /health/details`):** Aggregates connection pool metrics (active/overflow limits) and request latency telemetry.

### Logging Outputs
Logs are written to the `backend/logs/` directory:
*   `app.log`: General application events and database traces.
*   `error.log`: Warnings and critical failure stack traces.
*   `audit.log`: Isolated compliance logs mapping security audits.

---

## 🗺️ Project Roadmap & Completed Phases

*   **[x] Phase 1: REST API Routing** - Endpoint declarations and basic schemas.
*   **[x] Phase 2: Database Harmonization** - Type-annotated mapping migrations to SQLAlchemy 2.0 and UTC standards.
*   **[x] Phase 3.1: Enterprise Infrastructure** - Pydantic settings parsing, security hardening, and logging.
*   **[x] Phase 3.2: Observability & Standards** - Custom formatting, slow SQL query intercepts, error wrappers, and final readiness audits.
*   **[x] Phase 3.3: Enterprise Core Infrastructure & Business Orchestration** - Standardized response envelopes, global exception filters, dynamic query pagination and search engines, subquery-backed dashboard analytics, background tasks executor, and in-app Notification Center.
*   **[ ] Phase 4: Production Deployment & Scale** - [NEXT PHASE] Distributed caching, asynchronous email gateways, CI/CD pipeline deployment.

---

## 📘 Learning Resources & Documentation Index

For developers and students, we maintain localized Vietnamese learning modules under the [docs/](file:///e:/TaskSyncEnterprise/docs/README.md) directory:
*   **[Tài Liệu Học Tập Tiếng Việt (Vietnamese Index)](file:///e:/TaskSyncEnterprise/docs/learning/README.md):** Complete study modules from database design to observability.
*   **[Master Documentation Index](file:///e:/TaskSyncEnterprise/docs/README.md):** Access entry point for all architectural blueprints, backlogs, and phase reports.

---

## 📸 Screenshots
*(Screenshots showing Dashboard, Employees management, and Tasks tracking will be placed here)*

---

## 📄 License
Proprietary and Confidential. Copyright (c) 2026 TaskSync Enterprise. All rights reserved.

## 👤 Author
Developed and maintained by **Huynh Le Thanh Nhan** and the TaskSync Enterprise core engineering team.

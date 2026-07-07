# 🚀 TaskSyncEnterprise — Enterprise HRM & Project Management

TaskSyncEnterprise is an enterprise-grade platform that integrates Human Resource Management (HRM) and Project Management functionalities. Designed with strict security policies, real-time notification alerts, global audit logging, and modern React dashboard structures.

---

## 🏛️ Project Overview

### High-Level Architecture
TaskSyncEnterprise implements a decoupled Client-Server architecture:
*   **Frontend (SPA):** Built using React 19, React Router Dom v7, and TailwindCSS v4. It manages client-side routing, theme modes (dark/light), and dashboard visualizations using Recharts.
*   **Backend (REST API):** Developed using FastAPI ASGI server. It provides high-performance asynchronous request handling, stateless JWT authentication, and structured validation.
*   **Database (Storage):** Microsoft SQL Server running under the `dbo` schema. It stores structural employee profiles, tasks, attachments metadata, and system audit logs. Database schema migrations are handled by Alembic, connected via SQLAlchemy 2.x and PyMSSQL.

```
┌──────────────────────────────────────────────────────────┐
│                   FRONTEND (React 19)                    │
│   TailwindCSS v4  │  Axios API Client  │  Recharts Stats │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTP REST API (JWT Bearer)
┌────────────────────────────▼─────────────────────────────┐
│                    BACKEND (FastAPI)                     │
│   ASGI Endpoint Routers  │  Auth/RBAC  │  Logging Filter │
└────────────────────────────┬─────────────────────────────┘
                             │ pymssql
┌────────────────────────────▼─────────────────────────────┐
│                  DATABASE (SQL Server)                   │
│   Schema: dbo  │  Alembic Migrations  │  Audit Tracking  │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack
*   **Language:** Python `3.11+` (Backend), JavaScript / JSX (Frontend)
*   **API Layer:** FastAPI, Uvicorn, Pydantic V2
*   **Data Access Layer:** SQLAlchemy 2.x (using PyMSSQL driver)
*   **Database Engine:** MS SQL Server 2019+
*   **Client Core:** React 19, Vite, TailwindCSS v4, React Router v7, Axios, TanStack React Query v5
*   **Testing:** Pytest

---

## ⚙️ Development Workflow

### Git Branching Strategy
We adopt a structured feature-branch workflow. All changes must go through Pull Requests:
*   `master`: Mirror of production release. Direct commits are blocked.
*   `develop`: Integration branch where feature branches merge.
*   `feature/phase-[ID]-[description]`: Feature-specific branch (e.g. `feature/phase-01-discovery`).
*   `bugfix/[issue-number]-[description]`: Short-lived bug mitigation branch.

### AI Collaboration Workflow
To maintain high code quality and prevent system regressions, AI agents and developers collaborate using specific roles and tools:
*   **Read-Before-Code:** Always read [workspace_configuration.md](file:///e:/TaskSyncEnterprise/workspace_configuration.md) and [enterprise_development_standards.md](file:///e:/TaskSyncEnterprise/enterprise_development_standards.md) before executing tasks.
*   **Zero Placeholders Rule:** Code modifications must be fully functional and complete. Placeholders like `// TODO` are prohibited.
*   **Continuous Verification:** Run testing suites (`pytest`) and database migrations checks (`alembic check`) immediately after edits.

### AI Responsibilities

#### Antigravity (Lead AI Coding Agent)
*   **Role:** Architect, Pair Programmer, and Code Implementer.
*   **Responsibilities:**
    *   Creating detailed implementation plans for user approval.
    *   Orchestrating subagents to perform browser automation, security scans, or codebase audits.
    *   Enforcing enterprise development standards and database policies.
    *   Writing and updating project handbooks, roadmap trackers, and walkthrough files.

#### Copilot (Contextual Autocomplete & CLI Helper)
*   **Role:** Inline assistant and development tool.
*   **Responsibilities:**
    *   Providing real-time inline code completions.
    *   Offering contextual syntactical advice during manual file edits.
    *   Providing quick terminal commands execution assistance.

---

## 📊 Project Status

### Completed Milestones
*   **Foundation:** Configured workspace base structures.
*   **Workspace Discovery:** Analyzed files, dependencies, and packages.
*   **Git Setup:** Established branching strategies and clean feature checkouts.
*   **AI Workspace Configuration:** Integrated agent rules in customization paths.
*   **Enterprise Development Standards:** Published the development handbook.
*   **Project Discovery:** Conducted a comprehensive read-only code audit.
*   **Enterprise Planning:** Constructed the future phases execution roadmap.
*   **Cleanup & Stabilization:** Standardized startup pathing and auto-directory creation.

### Current Branch
*   `feature/phase-01-discovery`

---

## 🚀 Next Phase

### Phase 2 — Infrastructure Validation

#### Objectives
*   **Validate SQL Server Connectivity:** Ensure the pymssql engine connects successfully to the database.
*   **Validate Alembic Migrations:** Check that migration versioning is synced and doesn't contain schema conflicts.
*   **Validate Seed Data:** Verify that the seeding script runs and populates all database structures.
*   **Validate FastAPI Startup:** Confirm the backend starts up without errors and handles CORS/logging.
*   **Validate Swagger:** Verify the `/docs` route renders standard schemas.
*   **Validate React Development Environment:** Ensure the Vite server runs and compiles TailwindCSS v4 styles.
*   **Validate Authentication Flow:** Verify login credentials checking, session registrations, and token blacklist filters.

---

## 🗺️ Project Roadmap

*   **Foundation** — Base Workspace Configuration ✅
*   **Phase 1** — Enterprise Project Discovery ✅
*   **Phase 2** — Infrastructure Validation *(Next)*
*   **Phase 3** — Model & Database Harmonization
*   **Phase 4** — API Authorization Refactoring
*   **Phase 5** — File Upload Pipeline Hardening
*   **Phase 6** **to** **39** — Agile Sprint Feature Implementation (HRM Core, Leave Management, Tasks, Kanban Board, Notifications, Real-Time Widgets, Analytics Dashboard, and Integrations)
*   **Phase 40** — Production Deployment, CI/CD, and Handover

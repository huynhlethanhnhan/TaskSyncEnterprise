# TaskSyncEnterprise — Enterprise Task & Work Management Platform

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC1-blue.svg)](docs/reports/final_release_candidate_report.md)
[![Backend Gate](https://img.shields.io/badge/Backend%20Pytest-408%20Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![Frontend Gate](https://img.shields.io/badge/Vite%20Build-Passed-success.svg)](docs/reports/final_release_candidate_report.md)
[![E2E Acceptance](https://img.shields.io/badge/Browser%20Acceptance-10%2F10%20Passed-success.svg)](docs/reports/final_release_candidate_report.md)

## 📌 Executive Product Overview

**TaskSyncEnterprise** is a multi-tenant, role-based enterprise task management platform built for modern agile software development teams. The platform cleanly integrates **Administration Governance** (`Department -> Team -> Employee`) with **Agile Work Management** (`Project -> ProjectMember -> Sprint -> Task -> TaskAssignment -> Board -> Backlog -> Notifications -> Dashboard -> Calendar`).

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, Alembic (Migrations), PyMSSQL / SQLite.
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query, Lucide Icons.
- **Testing & E2E**: Pytest, Playwright E2E browser test runner.
- **Database & Cache**: MS SQL Server 2019+ / LocalDB, Redis (Cache invalidation with graceful fallback).

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

## 🚀 Quick Start & Development Setup

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m alembic upgrade head
python Seed_Example.py
python -m uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

---

## 🧪 Quality Gates & Automated Acceptance

Run all quality gates:
```powershell
# Backend pytest suite (408 tests)
cd backend
.\.venv\Scripts\python.exe -m pytest tests

# Frontend Vite build check
cd ..\frontend
npm run build

# Playwright E2E browser acceptance suite (10/10 tests)
cd ..
node frontend/e2e/run-acceptance.mjs
```

---

## 📖 Key Documentation Links

- [Final Release Candidate Report](docs/reports/final_release_candidate_report.md)
- [Final Manual Acceptance Guide](docs/guides/final_manual_acceptance_guide.md)
- [Final Bug Fix Matrix](docs/reports/final_bug_fix_matrix.md)
- [Enterprise Business Relationships Architecture](docs/architecture/business_relationships.md)
- [Project Organization Stabilization Report](docs/reports/project_organization_frontend_stabilization_report.md)

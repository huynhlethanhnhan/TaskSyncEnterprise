# TaskSyncEnterprise — Phase 4.4 Business Workspace Guide

**Document Version:** 1.0.0  
**Phase:** Phase 4.4 Full Business Workspace Integration  

---

## 1. Overview & Architecture

Phase 4.4 converts the TaskSyncEnterprise frontend from a runtime shell into a production-grade enterprise application. All representative mock data has been replaced with real backend API integrations (`/api/v1/dashboard/analytics`, `/api/v1/projects`, `/api/v1/tasks`, `/api/v1/employees`, `/api/v1/departments`, `/api/v1/notifications`, `/api/v1/auth/me`).

Key highlights of the architecture:
- **Centralized API Services (`src/api/services.ts`)**: Strongly-typed TypeScript interfaces and Axios request wrappers.
- **TanStack Query State Sync (`src/hooks/*.ts`)**: Automatic caching, background refetching, and query invalidation upon CRUD operations.
- **Drawer Form Architecture (`src/components/drawers/*.tsx`)**: Modern slide-over drawers (`ProjectDrawer`, `TaskDrawer`, `EmployeeDrawer`, `DepartmentDrawer`) utilizing Phase 4.2 UI primitives (`Input`, `Select`, `Textarea`, `Switch`, `Button`).
- **Standardized Enterprise Visual Language**: High-density layouts, clear typography hierarchy, and Vietnamese terminology.

---

## 2. Business Workspace Modules

### 2.1 Dashboard (`/dashboard`)
- **Real Backend Endpoints**: `GET /api/v1/dashboard/analytics`
- **KPI Metrics**: Real-time counts for Total Employees, Active Projects, Task Completion Percentage, and Overdue Tasks.
- **Analytics Breakdowns**: Task status distribution grid and department headcount summary cards.
- **Loading & Fallback**: Skeleton cards (`SkeletonCard`) during query loading; `ErrorState` fallback on API connectivity failure.

### 2.2 Projects (`/projects` & `/projects/:id`)
- **Real Backend Endpoints**: `GET /projects`, `POST /projects`, `PUT /projects/{id}`, `DELETE /projects/{id}`
- **Features**: Search bar, status filter dropdown, pagination, and `ProjectDrawer` slide-over form for Create/Edit operations.

### 2.3 Tasks (`/tasks`)
- **Real Backend Endpoints**: `GET /tasks`, `GET /tasks/my-tasks`, `POST /tasks`, `PUT /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`
- **Features**: Dual-view toggle (Kanban Board View vs. Data Table View), status filter, priority filter, project filter, role-based permission checks (Admin/Manager create & delete, Staff status update), and `TaskDrawer`.

### 2.4 Employees (`/employees` & `/employees/:id`)
- **Real Backend Endpoints**: `GET /employees`, `POST /employees`, `PUT /employees/{id}`, `DELETE /employees/{id}`
- **Features**: Enterprise employee directory with `Avatar`, `Badge` status indicators, department filter, search bar, and `EmployeeDrawer`.

### 2.5 Departments (`/departments` & `/departments/:id`)
- **Real Backend Endpoints**: `GET /departments`, `POST /departments`, `PUT /departments/{id}`, `DELETE /departments/{id}`
- **Features**: Department cards with employee headcount calculation, manager details, search filter, and `DepartmentDrawer`.

### 2.6 Notifications (`/notifications`)
- **Real Backend Endpoints**: `GET /notifications`, `PUT /notifications/{id}/read`, `POST /notifications/mark-all-read`
- **Features**: Tabbed filter (Tất cả, Chưa đọc, Đã đọc), individual & bulk mark-as-read actions, and header badge counter synchronization.

### 2.7 Profile (`/profile`)
- **Real Backend Endpoints**: `GET /auth/me`, `PUT /employees/{id}`, `POST /auth/change-password`
- **Features**: Account details synchronization, job title configuration, and security modal for password change.

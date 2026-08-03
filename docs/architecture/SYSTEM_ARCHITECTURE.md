# Kiến trúc Hệ thống TaskSyncEnterprise

## 1. Tổng quan Kiến trúc

**TaskSyncEnterprise** là nền tảng quản lý công việc và dự án enterprise theo mô hình **Modular Monolith**. Kiến trúc phân lớp rõ ràng nhằm bảo đảm hiệu năng cao, dễ mở rộng và tuân thủ các chuẩn an toàn thông tin doanh nghiệp.

### Các thành phần chính:
- **Frontend Layer**: React 19 + TypeScript + Vite + TailwindCSS v4 + TanStack React Query.
- **API Boundary Layer**: FastAPI + Pydantic v2 (REST API v1 + WebSockets).
- **Core Business Layer**: Services, Domain Validators, Cache Invalidation Engine.
- **Persistence & Data Layer**: Microsoft SQL Server 2022 (Source of Truth) + SQLAlchemy 2.0 ORM + Alembic Migration Engine.
- **Caching & Realtime Layer**: Redis 7.x + Standardized WebSocket Manager.

---

## 2. System Context Diagram

```mermaid
flowchart TD
    subgraph Users ["Người dùng & Vai trò"]
        Admin["Admin System"]
        Manager["Department Manager"]
        TeamLeader["Team Leader"]
        Employee["Employee"]
    end

    subgraph Frontend ["Client Layer (React 19 SPA)"]
        WebUI["Vite React Single Page App\n(http://localhost:5173)"]
        StateEngine["TanStack Query + Axios"]
    end

    subgraph Gateway ["Reverse Proxy & Gateway"]
        Nginx["Nginx Proxy / Router"]
    end

    subgraph Backend ["Backend Layer (FastAPI Modular Monolith)"]
        APIRouter["API Router / v1 / Auth / RBAC"]
        BusinessServices["Domain Services (Project, Task, Backlog, Org)"]
        ORM["SQLAlchemy 2.0 ORM Engine"]
    end

    subgraph Storage ["Persistence Layer"]
        MSSQL[("Microsoft SQL Server 2022\n(TaskSyncEnterprise DB)")]
        RedisCache[("Redis Cache & Pub/Sub")]
    end

    Admin --> WebUI
    Manager --> WebUI
    TeamLeader --> WebUI
    Employee --> WebUI

    WebUI --> StateEngine
    StateEngine --> Gateway
    Gateway --> Backend
    APIRouter --> BusinessServices
    BusinessServices --> ORM
    ORM --> MSSQL
    BusinessServices --> RedisCache
```

---

## 3. Frontend / Backend / Database Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant UI as React Component
    participant TQ as TanStack React Query
    participant API as FastAPI Router / Service
    participant RBAC as Security & RBAC Guard
    participant DB as MS SQL Server
    participant WS as WebSocket Engine

    UI->>TQ: Trigger Mutation (e.g. Create Backlog Item)
    TQ->>API: HTTP POST /api/v1/backlog (JSON Payload)
    API->>RBAC: Validate Token & Project Access Scope
    alt Permission Granted
        RBAC-->>API: Authorized
        API->>DB: Execute Transaction (Insert BacklogItem)
        DB-->>API: Commit Success & Return ID
        API->>WS: Publish Invalidation Event (backlog.changed)
        WS-->>UI: Broadcast Realtime Update Signal
        API-->>TQ: Return Standardized 201 Response Envelope
        TQ-->>UI: Re-fetch / Update UI Cache State
    else Unauthorized / IDOR Violation
        RBAC-->>API: Reject Access
        API-->>TQ: Return Standardized 403 / 409 Error Response
        TQ-->>UI: Display Toast Notification Error Message
    end
```

---

## 4. Organization Workflow: Department – Team – Employee

```mermaid
flowchart TD
    subgraph DepartmentScope ["Phòng Ban (Department)"]
        Dept["Phòng Ban (Department)"]
        DeptManager["Trưởng Phòng (Manager)"]
        DeptManager -->|Quản lý| Dept
    end

    subgraph TeamScope ["Nhóm Trực Thuộc (Team)"]
        TeamA["Team A"]
        TeamLeaderA["Team Leader A"]
        TeamB["Team B"]
        TeamLeaderB["Team Leader B"]

        Dept -->|Chứa 1..N| TeamA

        Dept -->|Chứa 1..N| TeamB
        TeamLeaderA -->|Dẫn dắt| TeamA
        TeamLeaderB -->|Dẫn dắt| TeamB
    end

    subgraph MemberScope ["Thành Viên (Employees)"]
        Emp1["Employee 1"]
        Emp2["Employee 2"]
        Emp3["Employee 3"]

        TeamA -->|Bao gồm| Emp1
        TeamA -->|Bao gồm| Emp2
        TeamB -->|Bao gồm| Emp3
    end
```

---

## 5. Work Management Domain Flow: Project – Sprint – Epic – Backlog – Task

```mermaid
flowchart LR
    Project["Dự Án (Project)"]
    Epic["Chủ đề / Epic (Topic)"]
    Backlog["Hạng mục Backlog (Product Backlog Item)"]
    Sprint["Chu kỳ (Sprint)"]
    Task["Công việc (Task)"]
    TaskAssignment["Phân công (TaskAssignment)"]

    Project -->|Phân rã thành| Epic
    Project -->|Chứa| Backlog
    Project -->|Quản lý qua| Sprint
    Backlog -->|"Liên kết tùy chọn"| Epic
    Backlog -->|"Gán vào tùy chọn"| Sprint
    Backlog -->|Chuyển đổi thành| Task
    Task -->|Bao gồm| TaskAssignment
```

---

## 6. RBAC Policy & Team Leader Delegated Scope

```mermaid
flowchart TD
    Request["Yêu cầu Thao tác / API Request"]
    CheckAdmin{Lớp Quyền: ADMIN?}
    CheckManager{Lớp Quyền: MANAGER?}
    CheckLeader{Lớp Quyền: TEAM LEADER?}
    CheckEmployee{Lớp Quyền: EMPLOYEE?}

    Request --> CheckAdmin
    CheckAdmin -- Có --> GrantAll["Toàn quyền Hệ thống (System Admin Scope)"]
    CheckAdmin -- Không --> CheckManager

    CheckManager -- Có --> ManagerScope{"Trong Phòng ban Quản lý?"}
    ManagerScope -- Có --> GrantDept["Thực thi Quyền Manager trong Department"]
    ManagerScope -- Không --> Deny["Từ chối (403 Forbidden)"]

    CheckManager -- Không --> CheckLeader
    CheckLeader -- Có --> LeaderScope{"Trong Team được phân công?"}
    LeaderScope -- Có --> CheckChangeLeader{"Có thao tác thay đổi Team Leader?"}
    CheckChangeLeader -- Không --> GrantTeam["Thực thi Quyền Leader trong Team Scope"]
    CheckChangeLeader -- Có --> DenyConflict["Từ chối (409 Conflict - Chỉ Admin được đổi Leader)"]
    LeaderScope -- Không --> Deny

    CheckLeader -- Không --> CheckEmployee
    CheckEmployee -- Có --> EmpScope{"Là Người thực hiện / Thành viên Dự án?"}
    EmpScope -- Có --> GrantSelf["Xem / Cập nhật tiến độ được giao"]
    EmpScope -- Không --> Deny
```

---

## 7. API Error Handling & Envelope Flow

```mermaid
flowchart TD
    Exception["Phát sinh Exception trong Backend"]
    CatchHandler["Unified Exception Handler (app/handlers/exception_handler.py)"]
    MapStandard["Map sang BaseAppException & Metric Prometheus"]

    Exception --> CatchHandler
    CatchHandler --> MapStandard

    subgraph ErrorResponseEnvelope ["Cấu trúc Response Chuẩn"]
        Success["success: false"]
        Message["message: Thông báo người dùng"]
        ErrorCode["error_code: Mã lỗi chuẩn"]
        Details["details: Chi tiết lỗi / Validation list"]
        TraceId["trace_id: X-Request-ID"]
    end

    MapStandard --> ErrorResponseEnvelope
    ErrorResponseEnvelope --> ClientToast["Frontend Axios / Toast Error Consumer"]
```

---

## 8. Startup, Alembic Migrations & Seed Flow

```mermaid
sequenceDiagram
    autonumber
    participant App as Backend Startup Engine
    participant DBConn as MSSQL Connection Verification
    participant Alembic as Alembic Migration Engine
    participant Seed as Seed Data Engine (Seed_Example.py)

    App->>DBConn: Kiểm tra Kết nối SQL Server (MSSQL_HOST:1433)
    alt Connection Success
        DBConn-->>App: Connected Pass
        App->>Alembic: Verify Alembic Migration Heads (python -m alembic heads)
        Alembic->>Alembic: alembic upgrade head
        Alembic-->>App: Database Schema Up to Date
        opt RUN_DEMO_SEED = true
            App->>Seed: Nạp Dữ liệu Mẫu Chế độ Demo
            Seed-->>App: Seed Applied Successfully
        end
        App->>App: Launch Uvicorn Web Server
    else Connection Failure
        DBConn-->>App: Connection Error (18452 / Host Unreachable)
        App->>App: Abort Execution & Output Error Guide
    end
```

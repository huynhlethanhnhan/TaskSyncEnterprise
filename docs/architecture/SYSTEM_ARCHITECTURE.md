# Kiến trúc phần mềm

## 1. Phong cách kiến trúc

TaskSyncEnterprise là một **modular monolith** theo kiến trúc phân lớp:

- **Client–Server:** React SPA gọi REST API và WebSocket.
- **Layered Architecture:** Router → Service/CRUD → ORM → Database.
- **Domain-oriented modules:** Project, Task, Sprint, Backlog, Organization, Collaboration, Vacation.
- **Event-driven realtime:** mutation phát domain event; trình duyệt nhận qua WebSocket và làm mới query cache.
- **Cache-aside:** dữ liệu chính nằm ở SQL Server; Redis chỉ tăng tốc và hỗ trợ trạng thái vận hành, không phải nguồn dữ liệu chuẩn.

Kiến trúc này phù hợp với quy mô hiện tại: triển khai đơn giản như monolith nhưng ranh giới module đủ rõ để tách service sau này.

## 2. System Context

```mermaid
flowchart LR
    Admin["Admin"]
    Manager["Manager / Team Leader"]
    Employee["Employee"]
    Browser["React Web Application"]
    Platform["TaskSyncEnterprise"]
    Mail["Email / Push provider (tùy chọn)"]

    Admin --> Browser
    Manager --> Browser
    Employee --> Browser
    Browser --> Platform
    Platform -. "notification" .-> Mail
```

## 3. Container Diagram

```mermaid
flowchart TB
    Browser["Browser"]
    Nginx["Nginx reverse proxy\nproduction"]
    Frontend["React 19 + Vite\nSPA"]
    Backend["FastAPI modular monolith\nREST /api/v1 + WebSocket"]
    SQL["Microsoft SQL Server 2022\nsource of truth"]
    Redis["Redis 7\ncache / readiness"]
    Storage["Upload volume\navatars / attachments"]
    Metrics["Prometheus + Grafana\noptional overlay"]

    Browser --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Frontend --> Backend
    Backend --> SQL
    Backend --> Redis
    Backend --> Storage
    Backend --> Metrics
```

Ở local, Browser gọi Vite `:5173`, Vite/axios gọi FastAPI `:8000`. Ở production, Nginx là điểm vào duy nhất.

## 4. Backend Layer Diagram

```mermaid
flowchart TB
    Request["HTTP / WebSocket request"]
    Router["routers/v1\nvalidation + authorization boundary"]
    Schema["Pydantic schemas"]
    Service["services\nbusiness workflow"]
    CRUD["crud\nquery and persistence operations"]
    ORM["SQLAlchemy models + Session"]
    DB["SQL Server"]
    Cache["CacheInvalidator + Redis"]
    Realtime["WebSocket Manager"]
    Audit["Audit / structured logging"]

    Request --> Router
    Router <--> Schema
    Router --> Service
    Service --> CRUD
    CRUD --> ORM
    ORM --> DB
    Service --> Cache
    Cache --> Realtime
    Router --> Audit
```

Quy tắc: RBAC phải được kiểm tra ở backend; việc ẩn nút trên frontend chỉ là UX.

## 5. Frontend Layer Diagram

```mermaid
flowchart TB
    Router["React Router"]
    Page["Feature pages"]
    Component["Reusable components"]
    Hook["TanStack Query hooks"]
    API["Axios service layer"]
    Provider["Auth / Theme / Toast providers"]
    Socket["Realtime notification hook"]
    Backend["FastAPI"]

    Router --> Page
    Page --> Component
    Page --> Hook
    Hook --> API
    Provider --> Page
    Socket --> Hook
    API --> Backend
    Backend --> Socket
```

Query key là hợp đồng đồng bộ dữ liệu. Event như `task.changed`, `topic.changed`, `feedback.changed`, `file.changed` và `vacation.changed` phải invalidate đúng query key.

## 6. Luồng ghi dữ liệu và realtime

```mermaid
sequenceDiagram
    participant A as Browser A
    participant API as FastAPI
    participant DB as SQL Server
    participant WS as WebSocket Manager
    participant B as Browser B

    A->>API: POST/PATCH/DELETE
    API->>DB: transaction
    DB-->>API: commit
    API->>WS: publish domain.changed
    API-->>A: response
    WS-->>B: domain event
    B->>B: invalidate React Query cache
    B->>API: refetch
    API-->>B: dữ liệu mới
```

Event chỉ phát sau commit thành công. Nếu Redis tắt, publish WebSocket vẫn phải hoạt động; tuy nhiên endpoint readiness hiện đánh dấu Redis là dependency cần thiết.

## 7. Deployment Diagram

```mermaid
flowchart LR
    Internet["Client"]
    Proxy["Nginx :80/:443"]
    FE["Frontend container :8080"]
    BE["Backend container :8000"]
    Init["sqlserver-init\none-shot"]
    SQL["SQL Server :1433"]
    Redis["Redis :6379"]
    Volume["Persistent volumes"]

    Internet --> Proxy
    Proxy --> FE
    Proxy --> BE
    Init --> SQL
    BE --> SQL
    BE --> Redis
    SQL --> Volume
    Redis --> Volume
```

`sqlserver-init` bảo đảm database tồn tại trước khi backend khởi động. Alembic vẫn chịu trách nhiệm tạo/cập nhật schema.

## 8. Ranh giới mở rộng

- Tách Notification thành worker/service khi lượng event lớn.
- Tách Reporting/AI inference khỏi request API vì đây là tác vụ nặng.
- Dùng object storage thay upload volume khi triển khai nhiều replica.
- Dùng outbox pattern nếu cần bảo đảm domain event không mất giữa commit database và publish.

# TaskSyncEnterprise — Nền Tảng Quản Lý Nhân Sự & Dự Án Doanh Nghiệp (Enterprise HRM & Project Management Platform)

[![CI Foundation](https://github.com/huynhlethanhnhan/TaskSyncEnterprise/actions/workflows/ci.yml/badge.svg)](https://github.com/huynhlethanhnhan/TaskSyncEnterprise/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.12-blue.svg)](backend/pyproject.toml)
[![React Version](https://img.shields.io/badge/react-19.0-blue.svg)](frontend/package.json)

TaskSyncEnterprise là một giải pháp quản lý nhân sự (HRM), đội nhóm và điều phối công việc tích hợp chuẩn doanh nghiệp. Hệ thống được xây dựng trên kiến trúc phân lớp sạch (Clean Architecture), tích hợp bảo mật sâu (SAST/SCA), hạ tầng quan sát tự động (Prometheus/Grafana/OpenTelemetry) và quy trình CI/CD hoàn thiện.

---

## 🎯 1. Trạng Thái Dự Án & Lộ Trình (Project Status & Roadmap)

Hiện tại hệ thống đã hoàn thành **Phase 3.8.6 (Nginx, Reverse Proxy & HTTPS Preparation)** với Nginx đóng vai trò là API Gateway / Single Entry Point duy nhất cho môi trường Production.

| Giai đoạn | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|
| **Phase 3.7.5** | Prometheus Metrics & OpenTelemetry | **Hoàn thành** | Đã cấu hình scrape metrics backend tự động |
| **Phase 3.7.6** | Tích hợp Grafana | **Hoàn thành** | Đã sẵn sàng datasource & dashboards giám sát |
| **Phase 3.8.1** | Đóng gói Docker & Sơ Khởi Production | **Hoàn thành** | Multi-stage build & non-root user image |
| **Phase 3.8.2** | GitHub Actions CI & Security Scan | **Hoàn thành** | Tích hợp Bandit, pip-audit & Pytest tự động |
| **Phase 3.8.3** | Production Docker Image Hardening | **Hoàn thành** | Đóng gói nâng cấp đa tầng bảo mật phi quyền |
| **Phase 3.8.6** | Nginx Gateway, Reverse Proxy & HTTPS | **Hoàn thành** | Nginx entrypoint duy nhất, ẩn backend/frontend port |


*Bằng chứng vận hành mới nhất:* Xem thêm tại [Báo Cáo Hoạt Động Prometheus (docs/reports/phase_3_7_5_runtime_validation.md)](file:///e:/TaskSyncEnterprise/docs/reports/phase_3_7_5_runtime_validation.md).

---

## 💻 2. Công Nghệ Áp Dụng (Technology Stack)

| Thành phần | Công nghệ | Phiên bản | Mô tả |
|---|---|---|---|
| **API Backend** | FastAPI | `0.110.0+` | ASGI Web Framework không đồng bộ hiệu năng cao |
| **ORM / Driver** | SQLAlchemy & PyMSSQL | `2.x` / `2.x` | Kết nối & ánh xạ cơ sở dữ liệu MS SQL Server |
| **Cơ sở dữ liệu** | Microsoft SQL Server | `2022-latest` | Cơ sở dữ liệu quan hệ doanh nghiệp chính |
| **Bộ nhớ đệm & Lock**| Redis | `7-alpine` | Quản lý Cache, Rate Limiting và Idempotency State |
| **Giao diện (Frontend)**| React & Vite | `19.x` & `8.x` | Giao diện Single Page Application (SPA) |
| **Định dạng giao diện**| TailwindCSS v4 | `4.3.1` | Thiết kế giao diện hiện đại tích hợp qua Vite plugin |
| **Quản lý dữ liệu** | React Query & Axios | `5.x` & `1.x` | Đồng bộ hóa server state và quản lý HTTP request |
| **Giám sát** | Prometheus & Grafana | `v3.13.1` & `11.1.0` | Thu thập metrics và trực quan hóa dashboard |
| **Thu thập chỉ số** | OpenTelemetry | Standard | Structured tracing và auto-instrumentation cho backend |

---

## 🏗️ 3. Kiến Trúc Hệ Thống (Architecture Overview)

Kiến trúc TaskSyncEnterprise triển khai theo mô hình Client-Server độc lập, giao tiếp thông qua RESTful API định dạng JSON và bảo mật bằng JWT Token:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser (React SPA)
    participant API as FastAPI Backend (:8000)
    participant Cache as Redis Cache (:6379)
    participant DB as MS SQL Server (:1433)
    participant Mon as Prometheus (:9090)

    User->>API: Gửi HTTP Request (JWT Bearer Token / X-Request-ID)
    activate API
    API->>Cache: Kiểm tra Idempotency Key / Rate Limiting
    activate Cache
    Cache-->>API: Phản hồi hợp lệ
    deactivate Cache

    API->>Cache: Truy vấn dữ liệu từ Cache (Read-Through Cache)
    activate Cache
    alt Cache Hit
        Cache-->>API: Trả về dữ liệu cache
    else Cache Miss
        deactivate Cache
        API->>DB: Thực thi truy vấn SQLAlchemy (Parameterized Query)
        activate DB
        DB-->>API: Trả về kết quả bảng biểu
        deactivate DB
        API->>Cache: Ghi nhận dữ liệu mới vào Cache
    end

    API-->>User: Phản hồi kết quả JSON (Correlation ID in Header)
    deactivate API

    Mon->>API: Scrape metrics định kỳ (/metrics)
    activate API
    API-->>Mon: Trả về chỉ số OpenTelemetry (HTTP, DB, Redis metrics)
    deactivate API
```

### Danh Sách Chức Năng Chính (Feature List)
*   **Authentication & Security:** JWT Token (Access & Refresh), Blacklist đăng xuất qua Redis, phân quyền RBAC (Admin, Manager, Employee).
*   **HRM Core:** Quản lý thông tin hồ sơ nhân sự, phòng ban (Department), đội nhóm (Team), chức danh.
*   **Project & Task Board:** Quản lý dự án, phân quyền thành viên dự án, bảng Kanban công việc (To Do, In Progress, Done), checklist công việc con, bình luận (Task Comments).
*   **Vacation Workflows:** Đăng ký nghỉ phép, phê duyệt hoặc từ chối nghỉ phép theo cấp bậc quản lý.
*   **Notification Engine:** Gửi thông báo thời gian thực qua WebSocket, hỗ trợ gửi mail chạy ngầm và tự động gửi lại khi lỗi (Email Retry Poller).
*   **Audit Logging & Security:** Tự động lưu lịch sử thay đổi dữ liệu (Audit logs), cơ chế xóa mềm (Soft Delete).
*   **API Middleware:** API versioning (`/v1`), API deprecation handling, Rate Limiting và Idempotency bảo vệ giao dịch.

---

## 📂 4. Cấu Trúc Repository (Repository Structure)

```text
TaskSyncEnterprise/
├── .github/workflows/         # Kịch bản CI/CD tự động (ci.yml)
├── backend/                   # Mã nguồn API Server (FastAPI)
│   ├── app/                   # Ứng dụng chính (core, routers, services, models, schemas)
│   ├── alembic/               # Lịch sử nâng cấp/hạ cấp schema DB (Migrations)
│   ├── tests/                 # Thử nghiệm tự động (Pytest suite, Security scan tools)
│   ├── seed_v2.py             # Script khởi tạo dữ liệu mẫu doanh nghiệp
│   └── Dockerfile             # Đóng gói backend đa tầng bảo mật (multi-stage)
├── frontend/                  # Mã nguồn giao diện người dùng (React, Vite, Tailwind v4)
│   ├── src/                   # Source code (api, components, layouts, pages, router)
│   └── package.json           # Cấu hình thư viện và scripts chạy giao diện
├── docs/                      # Tài liệu kỹ thuật, hướng dẫn vận hành, học tập
│   ├── api/                   # Tài liệu quản trị API
│   ├── architecture/          # Kiến trúc chi tiết và cấu trúc database
│   ├── database/              # Hướng dẫn dữ liệu mẫu
│   ├── frontend/              # Hướng dẫn xử lý sự cố giao diện
│   └── learning/              # Tài liệu đào tạo kỹ thuật doanh nghiệp
├── monitoring/                # Cấu hình hạ tầng giám sát
│   ├── prometheus/            # Luật thu thập dữ liệu (prometheus.yml)
│   └── grafana/               # Cấu hình datasource & dashboards mẫu
├── reports/                   # Tập hợp báo cáo kiểm tra an toàn và hiệu năng
├── roadmap/                   # Lộ trình phát triển sản phẩm qua các giai đoạn
├── docker-compose.yml         # Khởi chạy hệ sinh thái Backend, SQL Server, Redis
└── docker-compose.monitoring.yml # Khởi chạy hệ sinh thái Prometheus, Grafana, cAdvisor
```

---

## 🚀 5. Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### Bước 1: Tải mã nguồn & Cấu hình môi trường
Mở Terminal (PowerShell trên Windows) và thực thi:
```powershell
# 1. Clone repository
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
git switch develop

# 2. Khởi tạo cấu hình môi trường từ file mẫu
Copy-Item .env.example .env
```
Mở file `.env` vừa tạo và chỉnh sửa mật khẩu kết nối. Mật khẩu trong `DATABASE_URL` **phải trùng khớp hoàn toàn** với `MSSQL_SA_PASSWORD`:
```env
ENVIRONMENT=development
SECRET_KEY=replace-with-a-strong-random-secret-at-least-32-characters
MSSQL_SA_PASSWORD=ThanhNhan1807!
DATABASE_URL=mssql+pymssql://sa:ThanhNhan1807!@sqlserver:1433/TaskSyncEnterprise
REDIS_URL=redis://redis:6379/0
PROMETHEUS_BIND_ADDRESS=127.0.0.1
```

---

### Bước 2: Khởi chạy các dịch vụ lưu trữ & Cache (Docker)
Khởi động SQL Server và Redis container:
```powershell
docker compose up -d sqlserver redis
docker compose ps
```

---

### Bước 3: Đồng bộ Database Schema (Migrations) & Seed dữ liệu mẫu
Nhà phát triển cần tạo cơ sở dữ liệu trống bên trong container SQL Server, áp dụng cấu trúc bảng qua Alembic, và chạy script seed dữ liệu mẫu:

```powershell
# 1. Tạo Database trống trong SQL Server container
docker exec tasksync-sqlserver `
  /opt/mssql-tools18/bin/sqlcmd `
  -S localhost `
  -U sa `
  -P "ThanhNhan1807!" `
  -C `
  -Q "IF DB_ID('TaskSyncEnterprise') IS NULL CREATE DATABASE [TaskSyncEnterprise]"

# 2. Tạo môi trường ảo Python và cài đặt thư viện cho Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Chạy Alembic Migrations để tạo bảng
alembic upgrade head

# 4. Chạy script nạp dữ liệu mẫu
python seed_v2.py
```
*(Chi tiết về cấu trúc dữ liệu mẫu xem tại [Hướng Dẫn Khởi Tạo Dữ Liệu (docs/database/SEED_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/database/SEED_GUIDE.md))*

---

### Bước 4: Khởi chạy API Backend

#### Cách A: Chạy bằng Docker (Phù hợp triển khai nhanh)
Quay lại thư mục gốc và chạy lệnh phát triển:
```powershell
docker compose up -d --build backend
```
Hoặc khởi chạy môi trường sản xuất (hardened) tích hợp toàn bộ stack (Frontend, Backend, DB, Redis và Giám sát):
```powershell
# 1. Tạo file cấu hình môi trường từ file mẫu
copy .env.production.example .env

# 2. Chỉnh sửa file .env để cấu hình các password và secret khóa an toàn bắt buộc

# 3. Khởi chạy toàn bộ hệ thống
docker compose -f docker-compose.production.yml up -d --build
```

#### Cách B: Chạy local (Dành cho Debug mã nguồn trực tiếp)
Nếu chạy local, đảm bảo container backend của Docker đã được dừng để tránh tranh chấp cổng:
```powershell
docker compose stop backend

# Khởi chạy Uvicorn server cục bộ (tại thư mục backend/)
cd backend
$env:ENVIRONMENT="development"
$env:DATABASE_URL="mssql+pymssql://sa:ThanhNhan1807!@127.0.0.1:1433/TaskSyncEnterprise"
$env:REDIS_URL="redis://127.0.0.1:6379/0"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Bước 5: Khởi chạy React Frontend
Giao diện React được chạy cục bộ trên máy host:
```powershell
cd frontend
npm ci
npm run dev
```
Trình duyệt sẽ tự động mở trang [http://localhost:5173](http://localhost:5173). Đăng nhập bằng tài khoản Admin `admin@gmail.com` / Mật khẩu `123456`.

---

### Bước 6: Khởi chạy hạ tầng giám sát Monitoring (Prometheus & Grafana)
- **Môi trường phát triển (Local Development):** Khởi chạy hạ tầng giám sát độc lập quan sát backend local qua:
```powershell
docker compose -f docker-compose.monitoring.yml up -d
```
- **Môi trường sản xuất (Production):** Đã được tích hợp sẵn với cấu hình bảo mật và mạng cô lập trong `docker-compose.production.yml`. Không cần chạy lệnh riêng biệt.

---

## 🔗 6. Danh Sách Địa Chỉ Dịch Vụ (Service Endpoints)
Khi toàn bộ stack đã được khởi động thành công, các dịch vụ sẽ hoạt động tại các địa chỉ sau:
| Dịch vụ | Môi trường phát triển (Dev) | Môi trường sản xuất (Prod via Nginx Gateway) | Tài khoản mặc định | Mô tả |
|---|---|---|---|---|
| **Nginx Gateway** | - | [http://localhost/](http://localhost/) | - | Entry point duy nhất (Port 80/443) |
| **Frontend SPA** | [http://localhost:5173](http://localhost:5173) | [http://localhost/](http://localhost/) | `admin@gmail.com` / `123456` | Giao diện Single Page Application |
| **API Root** | [http://localhost:8000/api/v1](http://localhost:8000/api/v1) | [http://localhost/api/v1](http://localhost/api/v1) | - | Điểm truy cập các nghiệp vụ API |
| **Swagger UI** | [http://localhost:8000/docs](http://localhost:8000/docs) | [http://localhost/docs](http://localhost/docs) | - | Tài liệu tương tác API (OpenAPI) |
| **Health Details**| [http://localhost:8000/health/details](http://localhost:8000/health/details) | [http://localhost/health/details](http://localhost/health/details) | - | Trạng thái ổ đĩa, DB, Redis |
| **Gateway Health**| - | [http://localhost/healthz](http://localhost/healthz) | - | Nginx container live probe |
| **Prometheus UI** | [http://127.0.0.1:9090](http://127.0.0.1:9090) | [http://127.0.0.1:9090](http://127.0.0.1:9090) | Không yêu cầu | Tra cứu chỉ số dạng PromQL |
| **Grafana UI** | [http://127.0.0.1:3000](http://127.0.0.1:3000) | [http://127.0.0.1:3000](http://127.0.0.1:3000) | `admin` / `${GRAFANA_ADMIN_PASSWORD}` | Đồ thị trực quan hóa metrics |
| **cAdvisor UI** | [http://127.0.0.1:8081](http://127.0.0.1:8081) | [http://127.0.0.1:8081](http://127.0.0.1:8081) | Không yêu cầu | Chỉ số tài nguyên các container |


---

## 🛠️ 7. Quy Trình Phát Triển & Kiểm Thử (Developer Workflow)

### Luồng Git & Phân Nhánh (Git Workflow)
*   Nhánh phát triển chính: `develop`.
*   Tách nhánh tính năng: `feature/tên-tính-năng` từ `develop`.
*   Sửa lỗi khẩn cấp: `bugfix/mô-tả-lỗi` từ `develop`.
*   Tuyệt đối **không** commit trực tiếp lên `develop` hoặc `master`. Merge code thông qua Pull Request sau khi CI báo xanh.

### Tự động kiểm thử & Quét bảo mật cục bộ (Local Testing)
Nhà phát triển được khuyến nghị chạy các lệnh sau cục bộ trước khi đẩy code:
```powershell
cd backend
# 1. Chạy Unit Test kiểm thử logic
python -m pytest tests/ --cov=app

# 2. Chạy quét bảo mật mã nguồn tĩnh (Bandit)
bandit -c pyproject.toml -r .

# 3. Chạy quét bảo mật thư viện phụ thuộc (pip-audit)
pip-audit -r requirements.txt --ignore-vuln PYSEC-2026-1325
```

---

## 📚 8. Liên Kết Tài Liệu Hướng Dẫn Kỹ Thuật (Documentation Links)

Dưới đây là các liên kết tài liệu chi tiết trong hệ thống để nhà phát triển tra cứu nhanh:

*   **Tổng quan tài liệu:** [Mục Lục Tài Liệu Hướng Dẫn (docs/INDEX.md)](file:///e:/TaskSyncEnterprise/docs/INDEX.md)
*   **Xử lý sự cố giao diện:** [Sự Cố Giao Diện Trống Dữ Liệu (docs/frontend/FRONTEND_TROUBLESHOOTING.md)](file:///e:/TaskSyncEnterprise/docs/frontend/FRONTEND_TROUBLESHOOTING.md)
*   **Kịch bản kiểm thử thủ công:** [Checklist Manual Test Hệ Thống (docs/testing/MANUAL_SYSTEM_TEST.md)](file:///e:/TaskSyncEnterprise/docs/testing/MANUAL_SYSTEM_TEST.md)
*   **Quản trị dữ liệu mẫu:** [Hướng Dẫn Chạy Seed Dữ Liệu (docs/database/SEED_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/database/SEED_GUIDE.md)
*   **Sổ tay đào tạo Backend:** [Hướng Dẫn Kỹ Thuật Backend Doanh Nghiệp (docs/learning/phase-3.8-backend-enterprise-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.8-backend-enterprise-guide-vi.md)
*   **Đào tạo bảo mật Docker:** [Đào Tạo Hardening Docker Image (docs/learning/phase-3.8.3-docker-hardening-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.8.3-docker-hardening-guide-vi.md)
*   **Vận hành giám sát:** [Cấu hình & Vận Hành Prometheus (docs/monitoring/prometheus_setup.md)](file:///e:/TaskSyncEnterprise/docs/monitoring/prometheus_setup.md)
*   **Vận hành quét bảo mật:** [Cấu Hình Bandit & pip-audit (docs/deployment/SECURITY_SCAN_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/SECURITY_SCAN_GUIDE.md)
*   **Vận hành Docker Production:** [Hướng Dẫn Vận Hành Docker Production (docs/deployment/PRODUCTION_DOCKER_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/PRODUCTION_DOCKER_GUIDE.md)
*   **Kiểm thử Docker:** [Manual Validation Checklist Docker (docs/testing/DOCKER_MANUAL_VALIDATION.md)](file:///e:/TaskSyncEnterprise/docs/testing/DOCKER_MANUAL_VALIDATION.md)
*   **Khắc phục sự cố Docker:** [Hướng Dẫn Sửa Lỗi Docker Container (docs/deployment/DOCKER_TROUBLESHOOTING.md)](file:///e:/TaskSyncEnterprise/docs/deployment/DOCKER_TROUBLESHOOTING.md)

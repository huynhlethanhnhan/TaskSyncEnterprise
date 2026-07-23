# TaskSyncEnterprise

TaskSyncEnterprise là nền tảng quản lý tác vụ, nhân sự, phòng ban, nghỉ phép, thông báo thời gian thực và nhật ký kiểm toán dành cho doanh nghiệp. Hệ thống được xây dựng trên nền tảng kiến trúc hiện đại gồm **FastAPI**, **SQL Server**, **Redis**, **React 19**, **TypeScript**, **Vite**, và **Tailwind CSS v4**.

---

## 📊 Trạng thái Dự án (Phase 4 Certified & Clean-Room Validated)

Phase 4 đã hoàn tất nghiệm thu toàn diện (Full-Stack Acceptance & Certification Passed) và được kiểm chứng độc lập trên môi trường Clean-Room tái tạo 100% từ đầu.

| Phase | Trạng thái | Bằng chứng / Tài liệu Tham chiếu |
|---|---|---|
| **4.1 Enterprise UI Foundation** | `Hoàn thành` | [`docs/frontend/DESIGN_SYSTEM_SPEC.md`](docs/frontend/DESIGN_SYSTEM_SPEC.md) |
| **4.2 Component Library** | `Hoàn thành` | [`frontend/src/components`](frontend/src/components) |
| **4.3 Runtime Shell & Authentication** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_3_AUDIT_REPORT.md`](docs/reports/phase-4/PHASE_4_3_AUDIT_REPORT.md) |
| **4.4 Business Workspace & Remediation** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_4_FINAL_AUDIT_REPORT.md`](docs/reports/phase-4/PHASE_4_4_FINAL_AUDIT_REPORT.md) |
| **4.5 Product Experience & Avatar** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_5_AVATAR_PROFILE_REPORT.md`](docs/reports/phase-4/PHASE_4_5_AVATAR_PROFILE_REPORT.md) |
| **4.6 Independent UX Audit** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_6_INDEPENDENT_AUDIT.md`](docs/reports/phase-4/PHASE_4_6_INDEPENDENT_AUDIT.md) |
| **4.7 Final Stabilization** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_7_FINAL_STABILIZATION_REPORT.md`](docs/reports/phase-4/PHASE_4_7_FINAL_STABILIZATION_REPORT.md) |
| **4.8 Runtime Verification & E2E** | `Hoàn thành` | [`docs/reports/phase-4/PHASE_4_8_RUNTIME_VERIFICATION_REPORT.md`](docs/reports/phase-4/PHASE_4_8_RUNTIME_VERIFICATION_REPORT.md) |
| **Clean-Room Clone Verification** | `Đã Nghiệm Thu` | [`docs/reports/phase-4/CLEAN_ROOM_CLONE_VALIDATION_REPORT.md`](docs/reports/phase-4/CLEAN_ROOM_CLONE_VALIDATION_REPORT.md) |
| **Phase 4 Final Certification** | **Đã Chứng Nhận (Certified)** | [`docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md`](docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md) |

---

## 🛠️ Hướng dẫn Khởi chạy Hệ thống (2 Supported Execution Modes)

Dự án hỗ trợ 2 chế độ khởi chạy độc lập: **Mode A (Cục bộ)** dành cho phát triển tính năng và **Mode B (Docker)** dành cho môi trường Production / Containerized.

---

### Mode A — Local FastAPI Development (Phát triển Cục bộ với FastAPI)

Chế độ này khởi chạy Backend FastAPI và Frontend React trực tiếp trên máy phát triển, kết nối tới SQL Server và Redis (chạy container hoặc dịch vụ máy cục bộ).

#### 1. Clone Repository & Tạo Environment File
```powershell
git clone -b develop https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise

Copy-Item .env.example .env
```

#### 2. Cấu hình Biến Môi trường Kết nối Database
Chỉnh sửa tệp `.env` để đặt thông số SQL Server của máy bạn:
- `MSSQL_HOST=127.0.0.1` (hoặc `localhost`, `localhost\SQLEXPRESS`)
- `MSSQL_PORT=1433`
- `MSSQL_DATABASE=TaskSyncEnterprise`
- `MSSQL_USER=sa`
- `MSSQL_PASSWORD=<Mật_Khẩu_SQL_Server_Của_Bạn>`

> **Lưu ý**: Thay thế các giá trị mẫu bằng thông số SQL Server thực tế trên máy tính của bạn. Không sử dụng tên máy riêng hay đường dẫn máy cá nhân.

#### 3. Khởi chạy SQL Server & Redis (hoặc dùng Docker cho Dịch vụ Cơ sở)
Nếu bạn chưa có SQL Server và Redis cài đặt sẵn trên máy, khởi chạy container cơ sở:
```powershell
docker compose up -d sqlserver redis
```

#### 4. Cài đặt & Khởi chạy Backend FastAPI
```powershell
cd backend

# Tạo và kích hoạt môi trường ảo Python
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Cài đặt phụ thuộc Python
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Đặt biến môi trường kết nối (PowerShell)
$env:DATABASE_URL="mssql+pymssql://sa:<MAT_KHAU_SA>@127.0.0.1:1433/TaskSyncEnterprise"
$env:REDIS_URL="redis://127.0.0.1:6379/0"

# Thực thi Alembic Migration đưa schema lên bản mới nhất (Revision: 7b31f6e4c2a0)
alembic upgrade head

# Khởi tạo dữ liệu mẫu (Seed Data)
python Seed_Example.py

# Khởi chạy Backend FastAPI Development Server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### 5. Cài đặt & Khởi chạy Frontend React
Mở cửa sổ terminal thứ 2:
```powershell
cd frontend
npm ci
npm run dev
```

#### 6. Kiểm tra & Xac thực Endpoints
- **Web App**: `http://127.0.0.1:5173/`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`
- **Health Check Endpoint**: `http://127.0.0.1:8000/api/v1/health`

Tài khoản demo khởi tạo:
- **Admin**: `admin@tasksync.example.com` / `TaskSync@2026`
- **Manager**: `manager.it@tasksync.example.com` / `TaskSync@2026`
- **Employee**: `employee001@tasksync.example.com` / `TaskSync@2026`

---

### Mode B — Docker Production-Like Setup (Triển khai Production với Docker Compose)

Chế độ này khởi chạy toàn bộ stack dịch vụ đóng gói trong Docker (Nginx, FastAPI, React, SQL Server 2022, Redis).

> **Quan trọng**: Trong môi trường Docker Compose, backend kết nối tới SQL Server bằng tên service container `MSSQL_HOST=sqlserver` (không dùng `localhost`, `127.0.0.1` hay tên máy host).

#### 1. Tạo Tệp Runtime Environment Production
```powershell
Copy-Item .env.production.example .env.production
```
Chỉnh sửa `.env.production` và thay thế các chuỗi bí mật:
```env
ENVIRONMENT=production
SECRET_KEY=ReplaceWithAStrongRandomSecretKey2026!
MSSQL_SA_PASSWORD=TaskSync@2026
REDIS_URL=redis://redis:6379/0
DATABASE_URL=mssql+pymssql://sa:TaskSync@2026@sqlserver:1433/TaskSyncEnterprise
```

#### 2. Kiểm tra Cú pháp Cấu hình Compose
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

#### 3. Build Images từ Zero (No-Cache Build)
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml build --no-cache
```

#### 4. Khởi chạy Toàn bộ Containers
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

#### 5. Kiểm tra Trạng thái Healthcheck các Services
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml ps
```
Yêu cầu tất cả 5 dịch vụ phải ở trạng thái `healthy`:
- `tasksync-nginx-prod` (Nginx Reverse Proxy - Port 80)
- `tasksync-backend-prod` (FastAPI Service)
- `tasksync-frontend-prod` (React Static Service)
- `tasksync-sqlserver-prod` (MS SQL Server Database)
- `tasksync-redis-prod` (Redis Cache & Pub/Sub)

#### 6. Thực thi Migrations & Seed trên Container
```powershell
# Chạy Alembic Upgrade
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint alembic backend upgrade head

# Chạy Seed Data
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint python backend Seed_Example.py
```

#### 7. Truy cập & Kiểm tra Nhật ký Dịch vụ
- **Trang chủ Production**: `http://127.0.0.1/`
- **Nginx Health Check**: `http://127.0.0.1/healthz`
- **Backend API Health Check**: `http://127.0.0.1/api/v1/health`
- **Xem Logs Runtime**:
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail 300
```

---

## 🔒 Quy trình Migration Alembic Safety

Alembic là cơ chế duy nhất được chấp nhận để nâng cấp và quản lý phiên bản database schema:

```powershell
cd backend
# Kiểm tra phiên bản migration hiện tại
alembic current

# Kiểm tra danh sách head revisions
alembic heads

# Tạo migration mới khi thay đổi models
alembic revision --autogenerate -m "mo_ta_thay_doi"

# Áp dụng migration lên database
alembic upgrade head
```

---

## 🧪 Quy trình Kiểm thử Tự động (Automated Verification)

### Backend Pytest Suite & OpenTelemetry Shutdown Check
```powershell
cd backend
.\.venv\Scripts\python.exe -m black --check .
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest tests/test_auth_runtime_fix.py -vv
.\.venv\Scripts\python.exe -m pytest -q
```

### Frontend Quality Gates
```powershell
cd frontend
npm run check:utf8
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## 📚 Cấu trúc Tài liệu Dự án (Documentation Structure)

Cấu trúc tài liệu chi tiết tại thư mục [`docs/`](docs/):

- [`docs/INDEX.md`](docs/INDEX.md) — Danh mục tổng hợp tài liệu dự án
- [`docs/architecture/`](docs/architecture/) — Tài liệu kiến trúc hệ thống
- [`docs/backend/`](docs/backend/) — Tài liệu kỹ thuật Backend FastAPI
- [`docs/database/`](docs/database/) — Tài liệu cơ sở dữ liệu & Alembic Guide
- [`docs/deployment/`](docs/deployment/) — Hướng dẫn triển khai Docker & Nginx
- [`docs/frontend/`](docs/frontend/) — Tài liệu kỹ thuật Frontend React & Design System
- [`docs/learning/`](docs/learning/) — Tài liệu kiến thức và hướng dẫn theo giai đoạn
- [`docs/reports/phase-4/CLEAN_ROOM_CLONE_VALIDATION_REPORT.md`](docs/reports/phase-4/CLEAN_ROOM_CLONE_VALIDATION_REPORT.md) — Báo cáo Kiểm chứng Clean-Room
- [`docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md`](docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md) — Chứng nhận Nghiệm thu Phase 4 Final
- [`docs/roadmap/MASTER_ROADMAP.md`](docs/roadmap/MASTER_ROADMAP.md) — Master Roadmap dự án (Phase 1–5)

# TaskSyncEnterprise

TaskSyncEnterprise là nền tảng quản lý tác vụ, nhân sự, phòng ban, nghỉ phép, thông báo thời gian thực và nhật ký kiểm toán dành cho doanh nghiệp. Hệ thống được xây dựng trên nền tảng kiến trúc hiện đại gồm **FastAPI**, **SQL Server**, **Redis**, **React 19**, **TypeScript**, **Vite**, và **Tailwind CSS v4**.

---

## 📊 Trạng thái Dự án (Phase 4 Certified)

Phase 4 đã hoàn tất nghiệm thu toàn diện (Full-Stack Acceptance & Certification Passed). Tất cả các gate chất lượng về giao diện, backend analytics 6 KPI, upload avatar, thông báo WebSocket thời gian thực, và quy trình kiểm thử tự động đều đạt 100% kết quả thành công.

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
| **Phase 4 Final Certification** | **Đã Chứng Nhận (Certified)** | [`docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md`](docs/reports/phase-4/PHASE_4_FINAL_CERTIFICATION.md) |

Xem thêm chi tiết tại [`Master Roadmap`](docs/roadmap/MASTER_ROADMAP.md) và [`Progress Tracker`](docs/roadmap/ROADMAP_PROGRESS_TRACKER.md).

---

## 🛠️ Hướng dẫn Phát triển Cục bộ (Local Development)

### 1. Chuẩn bị Môi trường (Clean-Room Setup)
Yêu cầu hệ thống:
- **Python 3.12+**
- **Node.js v20+**
- **Docker Desktop** (cho SQL Server và Redis)

Tạo tệp cấu hình môi trường phát triển từ template:
```powershell
Copy-Item .env.example .env
```

Khởi chạy container cơ sở dữ liệu và cache:
```powershell
docker compose up -d sqlserver redis
```

### 2. Thiết lập & Chạy FastAPI Backend

```powershell
cd backend

# Tạo và kích hoạt môi trường ảo Python
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Cài đặt phụ thuộc
python -m pip install -r requirements.txt

# Đặt biến môi trường kết nối database & redis (PowerShell)
$env:DATABASE_URL="mssql+pymssql://sa:ThanhNhan1807!@127.0.0.1:1433/TaskSyncEnterprise"
$env:REDIS_URL="redis://127.0.0.1:6379/0"

# Thực thi Alembic Migration đưa schema lên bản mới nhất
alembic upgrade head

# Khởi tạo dữ liệu mẫu (Seed Data)
python seed_v2.py

# Khởi chạy Backend FastAPI Development Server
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

> **Lưu ý về Seed Safety**: Scripts `seed_v2.py` / `Seed_Example.py` có cơ chế bảo vệ chống ghi đè dữ liệu trên database đã tồn tại. Nếu database đã có dữ liệu, script sẽ bỏ qua việc chèn trùng lặp trừ khi sử dụng tham số `--reset` (chỉ dùng cho môi trường test).

### 3. Thiết lập & Chạy React Frontend

Mở cửa sổ terminal thứ 2:
```powershell
cd frontend

# Cài đặt phụ thuộc sạch
npm ci

# Khởi chạy Vite Development Server
npm run dev
```

Ứng dụng React sẽ chạy tại `http://localhost:5173`. Frontend tự động proxy các request `/api/v1` và `/ws/notifications` tới FastAPI backend.

Tài khoản mặc định:
- **Admin**: `admin@tasksync.example.com` / `TaskSync@2026`
- **Manager**: `manager.it@tasksync.example.com` / `TaskSync@2026`
- **Employee**: `employee001@tasksync.example.com` / `TaskSync@2026`

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

### Backend Pytest Suite
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

### Frontend Code Standards & Quality Gates
```powershell
cd frontend

# Kiểm tra chuẩn Mã hóa Mã UTF-8
npm run check:utf8

# Kiểm tra TypeScript Typecheck
npm run typecheck

# Kiểm tra Code Formatting & ESLint
npm run lint

# Kiểm tra UI Contract Tests
npm run test

# Build thử bản Production Frontend Bundle
npm run build
```

### Playwright End-to-End Runtime Acceptance Tests
```powershell
cd frontend

# Chạy E2E Acceptance Runner hoàn chỉnh
node e2e-final-acceptance.mjs --stage=workflows
```

---

## 🐳 Quy trình Triển khai Production Docker Compose

Tạo tệp cấu hình runtime production:
```powershell
Copy-Item .env.production.example .env.production
# Chỉnh sửa .env.production và cập nhật các SECRET_KEY và MSSQL_SA_PASSWORD an toàn
```

Khởi chạy toàn bộ stack Docker Production:
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Kiểm tra trạng thái Healthy của các dịch vụ:
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Các dịch vụ bắt buộc phải ở trạng thái `healthy`:
- `tasksync-nginx-prod` (Nginx Reverse Proxy - Port 80/443)
- `tasksync-backend-prod` (FastAPI Service)
- `tasksync-frontend-prod` (React Static Service)
- `tasksync-sqlserver-prod` (MS SQL Server Database)
- `tasksync-redis-prod` (Redis Cache & Pub/Sub)

Kiểm tra endpoint sức khỏe hệ thống:
- `http://127.0.0.1/healthz` -> HTTP 200 OK
- `http://127.0.0.1/api/v1/health` -> HTTP 200 OK

---

## 📚 Cấu trúc Tài liệu Dự án (Documentation Structure)

Chi tiết cấu trúc tài liệu đã được tổ chức lại tại thư mục [`docs/`](docs/):

- [`docs/INDEX.md`](docs/INDEX.md) — Danh mục tổng hợp tài liệu dự án
- [`docs/architecture/`](docs/architecture/) — Tài liệu kiến trúc hệ thống
- [`docs/backend/`](docs/backend/) — Tài liệu kỹ thuật Backend FastAPI
- [`docs/database/`](docs/database/) — Tài liệu cơ sở dữ liệu & Alembic Guide
- [`docs/deployment/`](docs/deployment/) — Hướng dẫn triển khai Docker & Nginx
- [`docs/frontend/`](docs/frontend/) — Tài liệu kỹ thuật Frontend React & Design System
- [`docs/learning/`](docs/learning/) — Tài liệu kiến thức và hướng dẫn theo giai đoạn
- [`docs/reports/phase-4/`](docs/reports/phase-4/) — Các báo cáo nghiệm thu Phase 4
- [`docs/roadmap/MASTER_ROADMAP.md`](docs/roadmap/MASTER_ROADMAP.md) — Master Roadmap dự án
- [`docs/releases/MASTER_BRANCH_RELEASE_GUIDE.md`](docs/releases/MASTER_BRANCH_RELEASE_GUIDE.md) — Hướng dẫn Merge Release lên nhánh Master

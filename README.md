# TaskSyncEnterprise — Nền Tảng Quản Lý Công Việc & Dự Án Doanh Nghiệp

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC2-blue.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-437%20Passed-success.svg)](docs/reports/CODEX_FINAL_AUDIT.md)
[![Frontend Vite](https://img.shields.io/badge/Vite%20Build-Passed%201.4s-success.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Contract Tests](https://img.shields.io/badge/Contract%20Tests-28%2F28%20Passed-success.svg)](frontend/ui-contract.test.mjs)
[![Alembic Clean Database](https://img.shields.io/badge/Alembic%20Migrations-Verified%20Head-success.svg)](backend/alembic/versions/)

---

## 1. Tổng Quan Hệ Thống

**TaskSyncEnterprise** là nền tảng quản lý công việc và dự án enterprise đa người dùng (multi-tenant, role-based) được xây dựng cho các đội ngũ phát triển phần mềm theo mô hình Agile/Scrum. Nền tảng kết hợp chặt chẽ giữa **Cơ cấu Tổ chức Doanh nghiệp** (`Phòng ban -> Nhóm -> Nhân viên`) và **Quản lý Công việc Agile** (`Dự án -> Thành viên -> Sprint -> Topic/Epic -> Backlog -> Task -> TaskAssignment -> Kanban -> Thông báo -> Dashboard`).

---

## 2. Tài Liệu Kiến Trúc & Thiết Kế (Architecture Documentation)

Chi tiết sơ đồ kiến trúc, mô hình dữ liệu và ma trận phân quyền hệ thống được lưu trữ tại:

- 🏛️ [Tài liệu Kiến trúc Hệ thống (SYSTEM_ARCHITECTURE.md)](docs/architecture/SYSTEM_ARCHITECTURE.md)
- 📊 [Sơ đồ Quan hệ Dữ liệu & ERD (MODULE_RELATIONSHIP.md)](docs/architecture/MODULE_RELATIONSHIP.md)
- 🔒 [Ma trận Phân quyền RBAC (RBAC_PERMISSION_MATRIX.md)](docs/architecture/RBAC_PERMISSION_MATRIX.md)
- 🧭 [Roadmap Sản phẩm & AI (AI_PRODUCT_ROADMAP.md)](docs/roadmap/AI_PRODUCT_ROADMAP.md)

---

## 3. Công Nghệ Sử Dụng

- **Backend Framework**: Python 3.12+, FastAPI, Uvicorn (REST API v1)
- **Cơ sở Dữ liệu & ORM**: MS SQL Server 2022 / SQLEXPRESS, SQLAlchemy 2.0, Alembic, `pymssql`
- **Cache & Message Broker**: Redis 7 (In-memory caching, Cache Invalidation tự động, Session store)
- **Reverse Proxy & Web Server**: Nginx 1.27 Alpine (Hardened Non-root, SSL/TLS, Gzip, WebSockets `/ws/`)
- **Frontend Framework**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query
- **Kiểm thử & Chất lượng**: Pytest (437 tests passed 100%), Playwright E2E, Ruff, Black, ESLint, Hadolint

---

## 4. Cập Nhật Mới Nhất (Latest Engineering Updates)

- **Kanban Card Responsive Layout:** Tái cấu trúc hoàn toàn layout thẻ Kanban thành 3 hàng độc lập, loại bỏ triệt để lỗi ép chữ xếp dọc 1-2 ký tự khi sidebar mở rộng hoặc màn hình co nhỏ. Tiêu đề hiển thị trọn vẹn, co giãn mượt mà.
- **Phân quyền Xóa Toàn diện (RBAC & Delete Operations):**
  - **Admin & Manager:** Toàn quyền CRUD trên thẻ Kanban (Action Menu `⋮`), Task Detail Drawer (Nút đỏ "Xóa công việc"), trang Chi tiết Dự án (Nút Sửa/Xóa công việc gần đây và Vùng Nguy Hiểm - Xóa Dự án trong Cài đặt).
  - **Employee:** Tích hợp quy trình **Yêu cầu xóa (Request Delete)** kèm modal nhập lý do gửi cấp trên duyệt.
- **Sprint Agile Deletion Workflow:** Bổ sung API `DELETE /api/v1/sprints/{id}` và nút "Xóa Sprint" trên giao diện cho các sprint `Planned` và `Cancelled`. Tự động giải phóng toàn bộ Task và Backlog Item liên kết về Product Backlog an toàn.
- **Quy trình Thu hồi & Rút đơn Nghỉ phép (Vacation Revocation):**
  - **Manager & HR/Admin Thu hồi:** Nút "Thu hồi duyệt" (icon `Undo2`) cho phép đảo ngược trạng thái từ `Manager Approved` hoặc `HR Approved` về `Pending` để xử lý các tình huống bấm nhầm.
  - **Nhân viên Rút đơn:** Nhân viên có thể rút đơn (`Withdrawn`) ngay cả khi Manager đã duyệt sơ bộ nếu HR chưa duyệt cuối.
  - **Superuser Admin:** Admin có toàn quyền can thiệp vào mọi bước duyệt và có nút "Xóa đơn" vĩnh viễn.
- **CI/CD & Repository Hygiene:** Đảm bảo 100% test suites xanh trên GitHub Actions (`develop` và `master`), kiểm tra linter, typecheck, contract test và formatting chặt chẽ.

---

## 5. Kiến Trúc Docker & Môi Trường Container (Docker, Redis, Nginx)

Toàn bộ hệ thống được đóng gói thành các Docker container tối ưu hóa cho môi trường Enterprise:

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ :8080 (HTTP / WS)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ tasksync-frontend (Nginx 1.27 Alpine Hardened, Non-root)    │
│  - Static React 19 Bundle                                   │
│  - Reverse Proxy: /api/ -> backend:8000                     │
│  - Reverse Proxy: /ws/  -> backend:8000 (WebSockets)        │
│  - Health Endpoint: /health (200 OK)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ :8000
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ tasksync-backend (FastAPI + Python 3.12)                    │
│  - REST API v1 & WebSocket Notification Engine              │
│  - Alembic Auto-Migration                                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ :6379                        ▼ :1433
┌──────────────────────────────┐ ┌────────────────────────────┐
│ tasksync-redis               │ │ tasksync-sqlserver         │
│ (Redis 7 In-Memory Cache)    │ │ (MS SQL Server 2022)       │
└──────────────────────────────┘ └────────────────────────────┘
```

### 🚀 Khởi Chạy Bằng Docker Compose (Chỉ 1 Lệnh)

1. **Chuẩn bị file môi trường:**
   ```powershell
   Copy-Item .env.example .env
   ```
   > Đảm bảo thiết lập `MSSQL_SA_PASSWORD=TaskSync@2026` và `SECRET_KEY` trong file `.env`.

2. **Khởi động toàn bộ cụm dịch vụ:**
   ```powershell
   docker compose --env-file .env up -d --build
   ```

3. **Kiểm tra trạng thái container:**
   ```powershell
   docker compose ps
   ```
   Tất cả 4 containers phải ở trạng thái `healthy`:
   - `tasksync-frontend`: `http://localhost:8080`
   - `tasksync-backend`: `http://localhost:8000/api/v1/health`
   - `tasksync-redis`: cổng `6379`
   - `tasksync-sqlserver`: cổng `1433`

4. **Kiểm tra sức khỏe Redis & Nginx:**
   ```powershell
   # Ping Redis
   docker exec tasksync-redis redis-cli ping
   # Kết quả: PONG

   # Kiểm tra Nginx
   docker exec tasksync-frontend wget -qO- http://127.0.0.1:8080/health
   # Kết quả: healthy
   ```

5. **Nạp dữ liệu mẫu (Seeding Database):**
   > [!IMPORTANT]
   > Khi khởi chạy Docker lần đầu, cơ sở dữ liệu hoàn toàn trống rỗng (`RUN_DEMO_SEED=false`) để đảm bảo an toàn. Nếu không nạp dữ liệu mẫu, đăng nhập sẽ báo lỗi tài khoản không tồn tại. Để nạp bộ tài khoản và dữ liệu mẫu chuẩn theo đúng **Mục 8**, bạn chỉ cần chạy 1 lệnh:
   ```powershell
   docker exec tasksync-backend python Seed_Example.py
   ```
   > **Lệnh khôi phục lại dữ liệu mẫu từ đầu (Reset & Re-seed):**
   > ```powershell
   > docker exec -e ALLOW_DESTRUCTIVE_RESET=true tasksync-backend python Seed_Example.py --reset
   > ```

---

## 6. Kiến Trúc Giám Sát & Quan Sát (Monitoring & Observability: Prometheus, Grafana, Redis)

Hệ thống tích hợp cụm quan sát toàn diện theo chuẩn doanh nghiệp (3 Pillars of Observability: Metrics, Traces, Logs):

- **Prometheus (v3.13)**: Thu thập số liệu định lượng (Metrics) mỗi 15 giây từ endpoint `/metrics` của Backend và cAdvisor.
- **Grafana (v11.1)**: Trực quan hóa dữ liệu qua các bảng điều khiển (Dashboards) thời gian thực.
- **Redis (v7 Alpine)**: Bộ đệm In-Memory, quản lý phiên làm việc và kiểm soát Rate-Limit.
- **OpenTelemetry (OTel)**: Tự động đo lường và truy vết phân tán (Distributed Tracing) trên FastAPI, SQLAlchemy, Redis và HTTPX.

### 🚀 Khởi Chạy Cụm Giám Sát
```powershell
docker compose -f docker-compose.monitoring.yml up -d prometheus grafana
```

### 🌐 Bảng Tra Cứu Đường Dẫn Giám Sát & Tài Khoản

| Dịch vụ / Công cụ | Đường dẫn truy cập | Thông tin đăng nhập / Chức năng |
| :--- | :--- | :--- |
| **Grafana Dashboards** | `http://localhost:3000` | Tài khoản: **`admin`** / Mật khẩu: **`admin`** |
| **Prometheus Explorer** | `http://localhost:9090` | Truy vấn metrics PromQL (ví dụ: `http_requests_total`, `redis_requests_total`) |
| **Prometheus Targets** | `http://localhost:9090/targets` | Kiểm tra trạng thái kết nối các dịch vụ (State: `UP`) |
| **Redis Cache Server** | Cổng `6379` (TCP) | Xem qua Grafana hoặc lệnh: `docker exec tasksync-redis redis-cli keys "*"` |
| **Backend Metrics** | `http://localhost:8000/metrics` | Endpoint cung cấp số liệu thô định dạng Prometheus |
| **Backend Health Probe**| `http://localhost:8000/health/live` | Kiểm tra sức khỏe SRE của Backend (200 OK) |
| **Backend Swagger Docs**| `http://localhost:8000/docs` | Tài liệu tương tác và kiểm thử trực tiếp REST API v1 |

### 📊 Danh Mục Dashboards Tích Hợp Sẵn Trong Grafana
Khi truy cập `http://localhost:3000` (đăng nhập `admin`/`admin`), mở mục **Dashboards** bên menu trái để xem các màn hình giám sát chuyên sâu:
1. **Redis Overview (`/d/tasksync-redis-overview`)**: Giám sát trạng thái client Redis (`ONLINE`), tần suất gọi lệnh `GET`/`SETEX`, độ trễ truy xuất và tỷ lệ cache hit.
2. **Backend Overview (`/d/tasksync-backend-overview`)**: Lưu lượng truy cập (RPS), độ trễ P95/P99, tỷ lệ phản hồi HTTP 200/401/500.
3. **API Overview (`/d/tasksync-api-overview`)**: Thống kê chi tiết theo từng endpoint API.
4. **Database Overview (`/d/tasksync-database-overview`)**: Tần suất truy vấn SQL Server, thời gian phản hồi câu lệnh DB.
5. **Docker Overview (`/d/tasksync-docker-overview`)**: Tỷ lệ tiêu hao CPU, RAM của các container.
6. **Executive Overview (`/d/tasksync-executive-overview`)**: Báo cáo tổng quan sức khỏe toàn hệ thống dành cho quản lý.

---

## 7. Hướng Dẫn Phát Triển Local (Windows Native)

### 🐍 Bước 1: Khởi Tạo Backend (Python 3.12)
```powershell
cd TaskSyncEnterprise\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt
Copy-Item ..\.env.example .env
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### ⚛️ Bước 2: Khởi Tạo Frontend (React 19)
```powershell
cd TaskSyncEnterprise\frontend
npm install
npm run dev
```
Truy cập giao diện tại: `http://localhost:5173`.

---

## 8. Tài Khoản Đăng Nhập Mẫu (Demo Credentials)

Tất cả tài khoản sử dụng chung mật khẩu: **`TaskSync@2026`**
*(Được tự động tạo sau khi chạy lệnh nạp dữ liệu mẫu `Seed_Example.py`)*

| Vai trò | Email đăng nhập | Quyền hạn chính |
| :--- | :--- | :--- |
| **System Admin** | `admin@tasksync.example.com` | Quản trị toàn hệ thống, toàn quyền CRUD mọi thực thể, Onboard/Offboard |
| **IT Manager** | `manager.it@tasksync.example.com` | Quản lý phòng IT, duyệt nghỉ phép sơ bộ, CRUD dự án phòng ban |
| **Product Manager** | `manager.product@tasksync.example.com` | Quản lý phòng Sản phẩm, Product Backlog, quản lý Sprint |
| **Team Leader** | `employee015@tasksync.example.com` | Quản lý thành viên Team, phân công task, CRUD task dự án của team |
| **Employee** | `employee014@tasksync.example.com` | Thực thi task, kéo thả trạng thái, gửi đơn nghỉ phép, gửi yêu cầu xóa task |

---

## 9. Quy Trình Nhánh Git & CI/CD (Develop -> Master)

Dự án áp dụng chặt chẽ mô hình **GitFlow**:
- **Nhánh `develop`**: Nhánh phát triển chính, nơi tích hợp toàn bộ tính năng và bug fix.
- **Nhánh `master`**: Nhánh phát hành ổn định (Production Release).

### 🛡️ Tiêu chuẩn CI/CD GitHub Actions (100% Green Gate)
Mỗi commit / Pull Request đẩy lên `develop` hoặc `master` bắt buộc phải vượt qua:
1. **Repository Hygiene:** Không chứa file rác (`.env`, `.venv`, `dist`, `__pycache__`), `git diff --check` sạch sẽ không có trailing whitespace.
2. **Backend CI:** Ruff check sạch, Black formatted, Alembic migration head hợp lệ, **437/437 Pytest passed** kèm báo cáo coverage, Bandit & pip-audit bảo mật.
3. **Frontend CI:** ESLint 0 errors, TypeScript `tsc --noEmit` 0 errors, **28/28 Contract tests passed**, Vite production build thành công.
4. **Docker Validation:** Hadolint Dockerfile linter pass, Docker Buildx build thành công cả backend và frontend, cú pháp Docker Compose hợp lệ.

### 🔄 Quy Trình Đẩy Code & Merge Lên Master
```powershell
# 1. Kiểm tra trạng thái và commit trên develop
git checkout develop
git add .
git commit -m "feat(docs): add docker seeding instructions and monitoring stack guide"

# 2. Đẩy lên nhánh develop trên GitHub
git push origin develop

# 3. Tạo Pull Request hoặc merge sang master
git checkout master
git merge develop
git push origin master
```

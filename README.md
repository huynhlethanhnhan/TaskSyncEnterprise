# TaskSyncEnterprise — Nền Tảng Quản Lý Công Việc & Dự Án Doanh Nghiệp

[![Release Version](https://img.shields.io/badge/Version-v3.5.1-blue.svg)](CHANGELOG.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-493%20Passed-success.svg)](docs/reports/CODEX_FINAL_AUDIT.md)
[![Frontend Vite](https://img.shields.io/badge/Vite%20Build-Passed-success.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Contract Tests](https://img.shields.io/badge/Contract%20Tests-38%2F38%20Passed-success.svg)](frontend/ui-contract.test.mjs)
[![Alembic Clean Database](https://img.shields.io/badge/Alembic%20Migrations-Verified%20Head-success.svg)](backend/alembic/versions/)
[![Database-First Suite](https://img.shields.io/badge/Database--First-SQL%20Server%202022-green.svg)](Database/README.md)

---

## 1. Tổng Quan Hệ Thống

**TaskSyncEnterprise** là nền tảng quản lý công việc và dự án enterprise đa người dùng (multi-tenant, role-based) được xây dựng cho các đội ngũ phát triển phần mềm theo mô hình Agile/Scrum. Nền tảng kết hợp chặt chẽ giữa **Cơ cấu Tổ chức Doanh nghiệp** (`Phòng ban -> Nhóm -> Nhân viên`) và **Quản lý Công việc Agile** (`Dự án -> Thành viên -> Sprint -> Topic/Epic -> Backlog -> Task -> TaskAssignment -> Kanban -> Thông báo -> Dashboard`).

Hệ thống được thiết kế theo mô hình **Database-First** và kiến trúc đa tầng (Tiered Architecture), trong đó toàn bộ mô hình dữ liệu, ràng buộc nghiệp vụ (Rules), kích hoạt tự động (Triggers), thủ tục lưu trữ (Stored Procedures) và chỉ mục tối ưu hóa (Indexes) đều được hiện thực hóa trực tiếp trên **Microsoft SQL Server**.

---

## 2. Cấu Trúc Dự Án (Project Structure)

Dự án được phân tách rõ ràng thành các khối chuyên biệt phục vụ vận hành CSDL SQL Server, API backend và giao diện người dùng:

```text
TaskSyncEnterprise/
├── Database/                     # [DATABASE-FIRST SUITE] Kịch bản T-SQL thuần chạy trên SQL Server
│   ├── Scripts/                  # DDL tạo bảng, khóa chính, khóa ngoại, CHECK, DEFAULT, Seed data
│   ├── Triggers/                 # 5 Trigger T-SQL (Audit Trail, Soft-Delete, Agile rules, Cross-check)
│   ├── Procedures/               # Stored Procedures nghiệp vụ, Backup Audit và Views truy vấn toàn cục
│   ├── Indexes/                  # Tối ưu hóa truy vấn (B-Tree FK, Covering Index INCLUDE, Filtered Index)
│   ├── Backup/                   # Chiến lược Backup Full/Differential & Restore kiểm thử tính toàn vẹn
│   └── Verification/             # Kịch bản kiểm thử & đối soát dữ liệu SQL Server
├── backend/                      # [BACKEND API] FastAPI, Python 3.12, SQLAlchemy 2.0 ORM, Redis Cache
├── frontend/                     # [FRONTEND SPA] React 19, TypeScript, TailwindCSS v4, TanStack Query
├── docs/                         # [TÀI LIỆU HỆ THỐNG] Kiến trúc, vận hành CSDL, thiết kế ERD
│   ├── database/                 # Tài liệu kiến trúc CSDL: DATABASE_FIRST_ARCHITECTURE_REPORT.md
│   ├── architecture/             # SYSTEM_ARCHITECTURE.md, MODULE_RELATIONSHIP.md
│   └── reports/                  # DATA_MANAGEMENT_ROADMAP.md, audit logs, stabilization reports
└── monitoring/                   # [QUAN SÁT SRE] Prometheus, Grafana Dashboards, cAdvisor
```

### 📋 Bảng Tra Cứu Các Khối Chức Năng CSDL (Enterprise SQL Server Suite)

| Thành phần CSDL | Đường dẫn file T-SQL | Mục đích & Nghiệp vụ cốt lõi |
| :--- | :--- | :--- |
| **DDL Schema & Rules** | [`Database/Scripts/01_create_tables_and_constraints.sql`](Database/Scripts/01_create_tables_and_constraints.sql) | Khởi tạo toàn bộ bảng, PK, FK, Unique, Check Constraints và Default UTC. |
| **Dữ liệu khởi tạo chuẩn** | [`Database/Scripts/02_seed_initial_data.sql`](Database/Scripts/02_seed_initial_data.sql) | Nạp sẵn phòng ban, nhân viên, dự án, sprint, task cho môi trường staging/demo. |
| **Bộ 5 Triggers T-SQL** | [`Database/Triggers/02_triggers.sql`](Database/Triggers/02_triggers.sql) | Xóa mềm Instead-Of, Audit Log tự động, ràng buộc duy nhất 1 Active Sprint. |
| **Stored Procedures** | [`Database/Procedures/03_stored_procedures.sql`](Database/Procedures/03_stored_procedures.sql) | Thống kê dự án Single-pass (`sp_GetProjectOverviewStats`), Backup Audit (`sp_BackupDatabaseWithAudit`). |
| **Views Toàn Cục** | [`Database/Procedures/04_views.sql`](Database/Procedures/04_views.sql) | Tự động loại bỏ bản ghi xóa mềm (`vw_ActiveTasksOverview`), tổng hợp tải phòng ban. |
| **Chỉ mục Tối ưu hóa** | [`Database/Indexes/05_query_optimization_indexes.sql`](Database/Indexes/05_query_optimization_indexes.sql) | Covering Index (`INCLUDE`), Filtered Index giảm I/O truy vấn đọc. |
| **Chiến lược Backup/Restore** | [`Database/Backup/08_backup_and_restore_strategy.sql`](Database/Backup/08_backup_and_restore_strategy.sql) | Sao lưu Full/Diff kèm `RESTORE VERIFYONLY` và kiểm tra tính toàn vẹn. |

---

## 3. Kiến Trúc CSDL Doanh Nghiệp (Enterprise Data Architecture & Optimization)

Chi tiết thiết kế, chỉ mục tối ưu và ma trận đối tượng SQL Server được lưu trữ tại:  
👉 **[DATABASE_FIRST_ARCHITECTURE_REPORT.md](docs/database/DATABASE_FIRST_ARCHITECTURE_REPORT.md)**

Tóm tắt 4 trụ cột nghiệp vụ:
1. **Trigger (Cơ chế kích hoạt tự động):**
   - `trg_Tasks_SoftDelete_InsteadOf`: Chặn lệnh `DELETE` vật lý và tự động chuyển thành `UPDATE is_deleted = 1, deleted_at = SYSUTCDATETIME()`.
   - `trg_Tasks_AuditTrail`: Lấy dữ liệu từ bảng ảo `inserted` và `deleted` để ghi vết thay đổi trạng thái, độ ưu tiên, tiến độ vào `dbo.audit_logs`.
   - `trg_Sprints_ActiveSprintConstraint`: Ràng buộc Scrum — chỉ cho phép tối đa 1 Sprint Active trong mỗi dự án, tự động `ROLLBACK TRANSACTION` nếu vi phạm.
   - `trg_Tasks_ValidateSprintProject`: Ngăn chặn gán nhầm Sprint của dự án khác cho Task.
   - `trg_TaskAssignments_ValidateMember`: Chặn phân công task cho nhân viên chưa tham gia dự án.
2. **Rule (Quy tắc & Ràng buộc toàn vẹn):**
   - Đảm bảo toàn vẹn tham chiếu qua khóa chính, khóa ngoại, bảng liên kết N-N.
   - Ràng buộc miền giá trị `CHECK CONSTRAINT` cho trạng thái và mức độ ưu tiên.
   - Ràng buộc duy nhất `UNIQUE CONSTRAINT` chống trùng lặp thành viên dự án và snapshot tiến độ.
3. **Query Optimization (Tối ưu hóa truy vấn):**
   - **Foreign Key Indexing**: Đánh B-Tree Index cho 100% khóa ngoại, chuyển `Table Scan` thành `Index Seek`.
   - **Covering Index (`INCLUDE`)**: Đưa các cột hay truy vấn vào cây index để loại bỏ triệt để chi phí `Key Lookup`.
   - **Filtered Index**: Chỉ đánh index trên các dòng chưa hoàn thành và chưa xóa (`WHERE is_deleted = 0 AND status <> N'Done'`), giảm 80% dung lượng index.
   - **Stored Procedure Aggregation**: Đóng gói 6-7 truy vấn thống kê rời rạc thành 1 lần quét bảng duy nhất, giảm độ trễ từ 120ms xuống < 5ms.
4. **Rules Global (Quy tắc truy vấn toàn cục):**
   - View toàn cục `vw_ActiveTasksOverview` tự động tích hợp điều kiện Soft-Delete `WHERE is_deleted = 0`.
   - Row-Level Security Scoping phân quyền truy cập dòng theo vai trò (Admin, Manager, Employee) qua `project_scope_predicate`.

---

## 4. Tài Liệu Kiến Trúc & Thiết Kế (Architecture Documentation)

Chi tiết sơ đồ kiến trúc, mô hình dữ liệu và ma trận phân quyền hệ thống được lưu trữ tại:

- 🏛️ [Tài liệu Kiến trúc Hệ thống (SYSTEM_ARCHITECTURE.md)](docs/architecture/SYSTEM_ARCHITECTURE.md)
- 📊 [Sơ đồ Quan hệ Dữ liệu & ERD (MODULE_RELATIONSHIP.md)](docs/architecture/MODULE_RELATIONSHIP.md)
- 🔒 [Ma trận Phân quyền RBAC (RBAC_PERMISSION_MATRIX.md)](docs/architecture/RBAC_PERMISSION_MATRIX.md)
- 🧭 [Roadmap Sản phẩm & AI (AI_PRODUCT_ROADMAP.md)](docs/roadmap/AI_PRODUCT_ROADMAP.md)

---

## 5. Công Nghệ Sử Dụng

- **Backend Framework**: Python 3.12+, FastAPI, Uvicorn (REST API v1)
- **Cơ sở Dữ liệu & ORM**: MS SQL Server 2022 / SQLEXPRESS, SQLAlchemy 2.0, Alembic, `pymssql`
- **Cache & Message Broker**: Redis 7 (In-memory caching, Cache Invalidation tự động, Session store)
- **Reverse Proxy & Web Server**: Nginx 1.27 Alpine (Hardened Non-root, SSL/TLS, Gzip, WebSockets `/ws/`)
- **Frontend Framework**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query
- **Kiểm thử & Chất lượng**: Pytest (493 tests passed 100%), Playwright E2E, Ruff, Black, ESLint, Hadolint

---

## 6. Lịch Sử Phiên Bản & Bảng So Sánh Hệ Thống

### 📊 So Sánh Phiên Bản `v3.4.1` vs `v3.5.1`

| Hạng mục | Phiên bản `v3.4.1` (Trước đây) | Phiên bản `v3.5.1` (Hiện tại) |
| :--- | :--- | :--- |
| **Lược đồ CSDL & Migration** | `91d53e9f6c91` (28 bảng cốt lõi Work/Agile) | **`b2c3d4e5f6a7`** (`35` bảng: thêm HRM, Payroll, Recruitment, Password Reset, Backup Audit) |
| **Quản trị Nhân sự (HRM)** | Chỉ có danh sách Nhân viên & Nghỉ phép cơ bản | **HRM Hub (`/hrm`) đầy đủ:** Hợp đồng lao động, Chấm công, Tăng ca, Tuyển dụng, Bảng lương VND tự động |
| **Quên & Cấp lại mật khẩu** | Chưa có luồng yêu cầu/duyệt cấp lại mật khẩu | **`password_reset_service.py`:** Nhân viên tự gửi yêu cầu ở `/profile`, Admin duyệt/cấp lại kèm thông báo realtime |
| **UI Controls & Dark Mode** | `<select>` và `<input type="month">` mặc định trình duyệt; lỗi icon mắt kép & `* *` | **Portal `Select` & `MonthYearSelect`** hiện đại; ẩn icon mắt mặc định (`input::-ms-reveal`); chuẩn UTF-8 & Dark mode |
| **Tương thích Trigger SQL Server** | Lỗi `Error 334` nếu bảng có Trigger `OUTPUT inserted` | Thiết lập **`implicit_returning = False`** trên `Task`, `Sprint`, `TaskAssignment`; hỗ trợ đầy đủ Triggers T-SQL |
| **Dữ liệu Demo & Docker Stack** | `Seed_Example.py` chưa có HRM/Deadline 14 ngày; Nginx thiếu `/uploads/` | Tự động nạp HRM, lương khác 0 VND, deadline/nghỉ phép sắp tới; cập nhật `nginx.conf` (`/uploads/`) & backup mount |
| **Backup & Rollback Thực tế** | Script backup chưa chuẩn hóa LF / sai path Windows-Linux | Chuẩn hóa **LF toàn bộ `.sh`**, sửa path `restore_database.sh`, kiểm thử `sp_BackupDatabaseWithAudit` + `DBCC CHECKDB` + `alembic downgrade/upgrade` |
| **Kiểm thử Tự động & Security** | 437 Pytest, 28 Frontend Contract tests | **493 Pytest (100% pass)**, **38/38 Frontend Contract tests**, `black==26.5.1`, `ruff`, `bandit`, nâng cấp OpenTelemetry `1.45.2` vá `CVE-2026-126360` |

### 🔀 So Sánh Các Nhánh Git (`master` vs `develop` vs `Dev-Database`)

| Tiêu chí | `master` (Production Release) | `develop` (Tích hợp & Phát triển) | `Dev-Database` (Nghiên cứu & Môn học CSDL) |
| :--- | :--- | :--- | :--- |
| **Mục tiêu** | Phát hành ổn định, tài liệu doanh nghiệp chuẩn | Tích hợp tính năng, kiểm thử CI/E2E trước release | Phát triển chuyên sâu Database-First phục vụ đồ án/môn học |
| **Tài liệu `README.md`** | Chỉ tập trung kiến trúc Enterprise, so sánh version, Docker & Production | Đầy đủ thông tin phát triển, kiểm thử và tài liệu nghiên cứu CSDL | Bao gồm 4 trụ cột môn học CSDL, kịch bản Demo Giảng viên |
| **Tag phát hành** | `v3.4.0`, `v3.4.1`, `v3.5.0`, **`v3.5.1`** | Không gắn tag release | Nhánh làm việc / PR lên `develop` |

### 🏷️ Phiên bản `v3.5.1` / `v3.5.0` — Database-First, HRM Suite, Password Reset & Full-Stack Stabilization
Những gì đã triển khai và bổ sung trên nhánh `master` so với `v3.4.1`:
- **Bộ Master Database-First T-SQL & Backup/Rollback Audit:** Bổ sung trọn vẹn thư mục `Database/` (DDL schema, 5 Triggers T-SQL, Stored Procedures bao gồm `dbo.sp_BackupDatabaseWithAudit`, Views toàn cục, Indexing Suite, kịch bản verification); chuẩn hóa LF và sửa path trong `infrastructure/backup/scripts/` (`backup_database.sh`, `restore_database.sh`), đồng thời kiểm thử thực tế `RESTORE DATABASE` + `DBCC CHECKDB` + `alembic downgrade` / `upgrade head`.
- **Phân hệ Quản trị Nhân sự HRM, Bảng lương & Tuyển dụng:** Bổ sung 2 migration Alembic (`a1b2c3d4e5f6` -> `b2c3d4e5f6a7`), các API & giao diện `/hrm` cho Hợp đồng lao động, Chấm công, Tăng ca, Tính lương VND (với bộ chọn kỳ lương portal `MonthYearSelect`), Ứng viên tuyển dụng và dữ liệu mẫu (`seed_hrm.py`, `Seed_Example.py`).
- **Quy trình Quên mật khẩu & Cấp lại mật khẩu (Admin & Nhân viên):** Bổ sung dịch vụ `password_reset_service.py`, luồng tự yêu cầu cấp lại mật khẩu trong trang `/profile` cho nhân viên, modal cấp lại/reset ở Admin, và xử lý triệt để lỗi icon con mắt kép (`input::-ms-reveal`) cùng dấu `*` lặp.
- **Hiện đại hóa UI Controls & Sửa lỗi SQL Server Trigger Compatibility:** Thay thế `<select>` và `<input type="month">` mặc định bằng component portal hiện đại (`Select`, `MonthYearSelect`), thêm cấu hình `implicit_returning = False` cho các bảng có trigger SQL Server (`Task`, `Sprint`, `TaskAssignment`), và bổ sung dữ liệu deadline 14 ngày tới / lịch nghỉ phép sắp tới trên Dashboard.
- **Tăng cường Docker & CI/CD Gates:** Bổ sung proxy `/uploads/` trong `frontend/nginx.conf`, biến môi trường `FRONTEND_BASE_URL` / `SMTP_*` và volume backup trong `docker-compose*.yml`, đồng bộ `database-ci.yml`, `black --check`, `ruff`, `pip-audit` (nâng cấp `opentelemetry-api==1.45.2`) và `bandit`.

### 📌 Tổng kết các phiên bản `master` trước đó (`v3.4.0` -> `v3.4.1`)
- **Đồng bộ tiến độ & Cảnh báo ngữ cảnh (`v3.4.0` / `v3.4.1`):** Đồng bộ tiến độ Dự án & Sprint theo thời gian thực, cảnh báo ngữ cảnh Sprint/Backlog/Task riêng lẻ và kiểm thử Chrome E2E.
- **Kanban Card Responsive Layout:** Tái cấu trúc hoàn toàn layout thẻ Kanban thành 3 hàng độc lập, loại bỏ lỗi ép chữ xếp dọc khi sidebar mở rộng hoặc màn hình co nhỏ.
- **Phân quyền Xóa Toàn diện (RBAC & Delete Operations):** Phân quyền CRUD cho Admin & Manager; nhân viên gửi Yêu cầu xóa (`Request Delete`) kèm lý do.
- **Sprint Agile Deletion Workflow & Thu hồi Nghỉ phép:** API `DELETE /api/v1/sprints/{id}` giải phóng Task về Backlog an toàn; quy trình thu hồi duyệt (`Undo2`) và rút đơn nghỉ phép (`Withdrawn`).
- **CI/CD & Repository Hygiene:** Đảm bảo 100% test suites xanh trên GitHub Actions (`Dev-Database`, `develop`, `master`).

---

## 7. Kiến Trúc Docker & Môi Trường Container (Docker, Redis, Nginx)

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
   > Khi khởi chạy Docker lần đầu, cơ sở dữ liệu hoàn toàn trống rỗng (`RUN_DEMO_SEED=false`) để đảm bảo an toàn. Nếu không nạp dữ liệu mẫu, đăng nhập sẽ báo lỗi tài khoản không tồn tại. Để nạp bộ tài khoản và dữ liệu mẫu chuẩn theo đúng **Mục 10**, bạn chỉ cần chạy 1 lệnh:
   ```powershell
   docker exec tasksync-backend python Seed_Example.py
   ```
   > **Lệnh khôi phục lại dữ liệu mẫu từ đầu (Reset & Re-seed):**
   > ```powershell
   > docker exec -e ALLOW_DESTRUCTIVE_RESET=true tasksync-backend python Seed_Example.py --reset
   > ```

---

## 8. Kiến Trúc Giám Sát & Quan Sát (Monitoring & Observability: Prometheus, Grafana, Redis)

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

## 9. Hướng Dẫn Phát Triển Local (Windows Native)

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

## 10. Tài Khoản Đăng Nhập Mẫu (Demo Credentials)

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

## 11. Quy Trình Nhánh Git & CI/CD

Dự án áp dụng chặt chẽ mô hình **GitFlow** kết hợp nhánh chuyên biệt:
- **Nhánh `Dev-Database`**: Nhánh chuyên biệt nghiên cứu và hoàn thiện kịch bản CSDL thuần **Database-First**.
- **Nhánh `develop`**: Nhánh phát triển chính, tích hợp tính năng, tài liệu phát triển và kiểm thử tự động.
- **Nhánh `master`**: Nhánh phát hành ổn định (Production Release) với tài liệu vận hành doanh nghiệp.

### 🛡️ Tiêu chuẩn CI/CD GitHub Actions (100% Green Gate)
Mỗi commit / Pull Request đẩy lên `develop` hoặc `master` bắt buộc phải vượt qua:
1. **Repository Hygiene:** Không chứa file rác (`.env`, `.venv`, `dist`, `__pycache__`), `git diff --check` sạch sẽ không có trailing whitespace.
2. **Backend CI:** Ruff check sạch, Black formatted, Alembic migration head hợp lệ (`b2c3d4e5f6a7`), **493/493 Pytest passed** kèm báo cáo coverage, Bandit & pip-audit bảo mật.
3. **Frontend CI:** ESLint 0 errors, TypeScript `tsc --noEmit` 0 errors, **38/38 Contract tests passed**, Vite production build thành công.
4. **Docker Validation:** Hadolint Dockerfile linter pass, Docker Buildx build thành công cả backend và frontend, cú pháp Docker Compose hợp lệ.

### 🔄 Quy Trình Đẩy Code, Merge Lên `master` & Gắn Tag Phát Hành
```powershell
# 1. Commit trên nhánh phát triển và đẩy lên Dev-Database
git checkout Dev-Database
git add .
git commit -m "feat(system): complete HRM, password reset UI, and backup/rollback"
git push -u origin Dev-Database

# 2. Tích hợp lên develop và phát hành trên master kèm tag SemVer
git checkout develop && git merge --ff-only Dev-Database && git push origin develop
git checkout master && git merge develop && git push origin master
git tag -a v3.5.1 -m "Release v3.5.1: Updated Docker Full Stack, HRM Seed, Enterprise README & Version Comparison"
git push origin v3.5.1
```

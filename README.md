# TaskSyncEnterprise — Nền Tảng Quản Lý Công Việc & Dự Án Doanh Nghiệp

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC1-blue.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-413%20Passed-success.svg)](docs/reports/CODEX_FINAL_AUDIT.md)
[![Frontend Vite](https://img.shields.io/badge/Vite%20Build-Passed-success.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Alembic Clean Database](https://img.shields.io/badge/Alembic%20Migrations-Verified%20Clean-success.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)

---

## 1. Tổng Quan Hệ Thống

**TaskSyncEnterprise** là nền tảng quản lý công việc và dự án enterprise đa người dùng (multi-tenant, role-based) được xây dựng cho các đội ngũ phát triển phần mềm theo mô hình Agile/Scrum. Nền tảng kết hợp chặt chẽ giữa **Cơ cấu Tổ chức Doanh nghiệp** (`Phòng ban -> Nhóm -> Nhân viên`) và **Quản lý Công việc Agile** (`Dự án -> Thành viên -> Sprint -> Topic/Epic -> Backlog -> Task -> TaskAssignment -> Kanban -> Thông báo -> Dashboard`).

---

## 2. Tài Liệu Kiến Trúc & Thiết Kế (Architecture Documentation)

Chi tiết sơ đồ kiến trúc, mô hình dữ liệu và ma trận phân quyền hệ thống được lưu trữ tại:

- 🏛️ [Tài liệu Kiến trúc Hệ thống (SYSTEM_ARCHITECTURE.md)](docs/architecture/SYSTEM_ARCHITECTURE.md)
- 📊 [Sơ đồ Quan hệ Dữ liệu & ERD (MODULE_RELATIONSHIP.md)](docs/architecture/MODULE_RELATIONSHIP.md)
- 🔒 [Ma trận Phân quyền RBAC (RBAC_PERMISSION_MATRIX.md)](docs/architecture/RBAC_PERMISSION_MATRIX.md)

---

## 3. Công Nghệ Sử Dụng

- **Backend Framework**: Python 3.12+, FastAPI, Uvicorn (REST API v1)
- **Cơ sở Dữ liệu & ORM**: MS SQL Server 2022 / SQLEXPRESS, SQLAlchemy 2.0, Alembic, `pymssql`
- **Frontend Framework**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query
- **Kiểm thử & Chất lượng**: Pytest (413 tests), Playwright E2E, Ruff, Black, ESLint, TypeScript

> [!NOTE]
> **Docker Release Disclaimer**: Docker SQL schema is not validated in this release. Local Windows + Python venv + MSSQL is the verified path.

---

## 4. Yêu Cầu Tiền Đề Môi Trường Windows

Trước khi khởi tạo dự án trên Windows local, cần cài đặt:
1. **Python 3.12+** (Đã thêm vào đường dẫn hệ thống `PATH`)
2. **Microsoft SQL Server** (MSSQLSERVER hoặc SQLEXPRESS)
3. **Node.js v20+** và `npm`
4. **Git**

---

## 5. Hướng Dẫn Khởi Tạo Dự Án Từ Đầu (Windows Local)

### 🚀 Bước 1: Clone Nhánh `develop`

```powershell
# Clone nhánh develop duy nhất
git clone --branch develop --single-branch https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git TaskSyncEnterprise

# Di chuyển vào thư mục dự án
cd TaskSyncEnterprise
```

---

### 🐍 Bước 2: Khởi Tạo Môi Trường Ảo Backend & Cài Đặt Dependencies

```powershell
# Di chuyển vào thư mục backend
cd backend

# Tạo môi trường ảo Python
python -m venv .venv

# Kích hoạt môi trường ảo trên PowerShell
.\.venv\Scripts\Activate.ps1

# Cập nhật pip và cài đặt thư viện
python -m pip install --upgrade pip
pip install -r requirements.txt -r requirements-dev.txt
```

---

### ⚙️ Bước 3: Cấu Hình Biến Môi Trường `.env` & Hướng Dẫn MS SQL Server Authentication

Sao chép file cấu hình mẫu từ thư mục gốc vào `backend\.env`:

```powershell
Copy-Item ..\.env.example .env
```

Điều chỉnh file `backend\.env` phù hợp với máy cục bộ:

```env
ENVIRONMENT=development
APP_NAME=TaskSyncEnterprise
SECRET_KEY=replace-with-a-strong-random-secret-at-least-32-characters

# Kết nối MS SQL Server Local
MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=TaskSyncEnterprise
MSSQL_USER=sa
MSSQL_PASSWORD=YourPassword123!

# Cấu hình CORS & Allowed Hosts (Hỗ trợ định dạng JSON array hoặc dấu phẩy)
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:8080","http://localhost:8000"]
CORS_ORIGINS=["http://localhost:5173","http://localhost:8080","http://localhost:8000"]
ALLOWED_HOSTS=["localhost","127.0.0.1","backend","frontend"]
```

#### 🛠️ Hướng dẫn Cấu hình SQL Server Authentication & Đổi chế độ SQL Login:
1. Mở **SQL Server Management Studio (SSMS)**, kết nối vào server.
2. Chuột phải vào Server Node -> chọn **Properties** -> mục **Security**.
3. Chọn chế độ **SQL Server and Windows Authentication mode** (Mixed Mode).
4. Chuột phải chọn Server Node -> **Restart** SQL Server Service.
5. Tạo hoặc Kích hoạt SQL User `sa`: Vào **Security -> Logins -> sa**, bật **Enabled** và đặt lại Password.

#### ⚠️ Xử lý Lỗi SQL Server Error 18452 (*"Login failed. The login is from an untrusted domain..."*):
- **Nguyên nhân**: SQL Server đang để chế độ *Windows Authentication Only* hoặc tài khoản SQL Login bị khóa/chưa được cấp quyền.
- **Khắc phục**: Chuyển sang Mixed Mode như hướng dẫn ở bước trên, mở lại cổng `1433` trong *SQL Server Configuration Manager* -> *SQL Server Network Configuration* -> *Protocols for SQLEXPRESS/MSSQLSERVER* -> Bật *TCP/IP*.

---

### 🗄️ Bước 4: Tạo Database MSSQL & Chạy Alembic Migrations

1. Tạo database trống `TaskSyncEnterprise` trong SQL Server bằng script có sẵn:

```powershell
sqlcmd -S 127.0.0.1 -i scripts\create_database.sql
```

2. Sau khi kiểm tra kết nối MSSQL pass, chạy Alembic migration để nâng cấp schema:

```powershell
python -m alembic upgrade head
```

3. Nạp dữ liệu mẫu chuẩn hóa cho môi trường demo:

```powershell
python Seed_Example.py --reset
```

---

### ⚛️ Bước 5: Cài Đặt Frontend & Chạy Server

Mở thêm một cửa sổ PowerShell mới, di chuyển đến thư mục `frontend`:

```powershell
cd TaskSyncEnterprise\frontend

# Cài đặt gói thư viện Node
npm install

# Chạy Frontend Dev Server
npm run dev
```

Chạy Backend API Server trong cửa sổ PowerShell backend:

```powershell
cd TaskSyncEnterprise\backend
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 🔑 6. Tài Khoản Đăng Nhập Mẫu (Demo Credentials)

Tất cả các tài khoản demo sử dụng chung một mật khẩu chuẩn:
- **Mật khẩu chung:** `TaskSync@2026`

| Vai trò | Email đăng nhập | Quyền hạn |
| :--- | :--- | :--- |
| **System Admin** | `admin@tasksync.example.com` | Quản trị toàn bộ hệ thống, phân quyền, đổi trưởng phòng/trưởng nhóm |
| **IT Manager** | `manager.it@tasksync.example.com` | Quản lý phòng IT, xem dự án, quản lý công việc phòng ban |
| **Product Manager** | `manager.product@tasksync.example.com` | Quản lý phòng Sản phẩm & Product Backlog |
| **Operations Manager** | `manager.ops@tasksync.example.com` | Quản lý phòng Vận hành, đổi trưởng nhóm và quản lý dự án/phân công |
| **Operations Team Leader** | `employee015@tasksync.example.com` | Quản lý thành viên Team Vận hành và công việc trong dự án |
| **Operations Employee** | `employee014@tasksync.example.com` | Nhân viên thực thi công việc và cập nhật task được giao |

---

## 🧪 7. Kiểm Thử Tự Động & Báo Cáo Bằng Chứng

### Kiểm Thử Tự Động Backend & Frontend Build

```powershell
# Kiểm tra biên dịch code Python
python -m compileall app alembic tests Seed_Example.py

# Chạy bộ test tự động Pytest
python -m pytest tests/

# Kiểm tra Linter Ruff & Format Black
python -m ruff check app tests alembic Seed_Example.py
python -m black --check .

# Build sản phẩm Frontend
cd ..\frontend
npm run lint
npm run typecheck
npm test
npm run build
```

### Chụp Ảnh Bằng Chứng Giao Diện Tự Động (Playwright)

```powershell
cd frontend
node e2e/capture-screenshots.mjs
```

Ảnh chụp tự động của Codex được lưu tại: `docs/testing/screenshots/codex/`
Báo cáo chi tiết xem tại: [CODEX_FINAL_AUDIT.md](docs/reports/CODEX_FINAL_AUDIT.md)

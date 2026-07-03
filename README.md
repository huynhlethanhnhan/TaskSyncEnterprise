# 🚀 TaskSync Enterprise V2

> **Hệ thống quản lý nhân sự và công việc doanh nghiệp** — xây dựng với FastAPI (Backend) + React Vite (Frontend) + SQL Server.

---

## 📋 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Yêu cầu cài đặt](#-yêu-cầu-cài-đặt)
- [Cài đặt Backend](#-cài-đặt-backend)
- [Cài đặt Frontend](#-cài-đặt-frontend)
- [Cấu hình Database](#-cấu-hình-database)
- [Khởi chạy hệ thống](#-khởi-chạy-hệ-thống)
- [Tài khoản mặc định](#-tài-khoản-mặc-định)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)

---

## ✨ Tính năng chính

| Module | Tính năng |
|--------|-----------|
| **Xác thực** | Đăng nhập JWT, phân quyền RBAC (Admin / Manager / Employee) |
| **Dashboard** | Thống kê tiến độ dự án, deadline, biểu đồ Kanban |
| **Tasks** | Tạo, chỉnh sửa, xóa task; Kanban board; cập nhật trạng thái kéo-thả |
| **Tài liệu đính kèm** | Upload/xóa file đính kèm theo task (phân quyền theo người upload & người được giao) |
| **Nhân viên** | Quản lý hồ sơ, phòng ban, vai trò |
| **Dự án** | CRUD dự án, thống kê tiến độ |
| **Nghỉ phép** | Xin nghỉ phép, duyệt/từ chối (Admin/Manager) |
| **Thông báo** | Thông báo thời gian thực khi được gán task |
| **Lịch** | Calendar view theo task deadline |
| **Audit Log** | Ghi nhận toàn bộ hoạt động hệ thống |

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (React Vite)           │
│  Port: 5173  │  Tailwind CSS  │  Axios API calls │
└──────────────────────┬──────────────────────────┘
                       │ HTTP REST API
┌──────────────────────▼──────────────────────────┐
│               BACKEND (FastAPI)                  │
│  Port: 8001  │  JWT Auth  │  SQLAlchemy ORM      │
└──────────────────────┬──────────────────────────┘
                       │ pymssql
┌──────────────────────▼──────────────────────────┐
│            DATABASE (SQL Server)                 │
│  Database: TaskSyncEnterprise  │  Port: 1433     │
└─────────────────────────────────────────────────┘
```

---

## 🛠 Yêu cầu cài đặt

Trước khi bắt đầu, hãy đảm bảo máy tính đã cài đặt:

| Phần mềm | Phiên bản tối thiểu | Link tải |
|----------|-------------------|----------|
| **Python** | 3.11+ | https://python.org |
| **Node.js** | 18+ | https://nodejs.org |
| **SQL Server** | 2019+ (hoặc Express) | https://microsoft.com/sql-server |
| **Git** | Bất kỳ | https://git-scm.com |

---

## 📥 Clone dự án

```bash
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
```

---

## 🐍 Cài đặt Backend

### Bước 1 — Tạo môi trường ảo Python

```bash
cd backend

# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### Bước 2 — Cài thư viện

```bash
pip install -r requirements.txt
```

### Bước 3 — Tạo file `.env`

Tạo file `backend/.env` với nội dung sau:

```env
MSSQL_CLIENT_ID=tasksync_spa_react_prod_2026
MSSQL_CLIENT_SECRET=U3VwZXJfU2VjcmV0X0NsaWVudF9LZXlfMjAyNl9OaGFuSHV5bmhfUmFuZG9tXzMydTBlOWQ
```

### Bước 4 — Cấu hình kết nối SQL Server

Mở file `backend/app/config.py` và chỉnh sửa:

```python
MSSQL_HOST: str = "TÊN_MÁY_TÍNH_CỦA_BẠN"   # Ví dụ: "DESKTOP-ABC123" hoặc "localhost"
MSSQL_DATABASE: str = "TaskSyncEnterprise"
```

> **Lưu ý:** Hệ thống dùng **Windows Authentication** (không cần username/password SQL). SQL Server phải bật TCP/IP ở port 1433.

---

## 🗄 Cấu hình Database

### Bước 1 — Tạo Database trống trong SQL Server

Mở **SQL Server Management Studio (SSMS)** → New Query → chạy:

```sql
CREATE DATABASE TaskSyncEnterprise;
```

### Bước 2 — Tạo bảng bằng Alembic (Migration)

```bash
# Đảm bảo đang ở thư mục backend/ và đã activate .venv
cd backend
alembic upgrade head
```

### Bước 3 — Nạp dữ liệu mẫu (Seed Data)

```bash
python seed_v2.py
```

Lệnh này sẽ tự động tạo:
- 1 Phòng ban: **Information Technology**
- 3 Tài khoản mẫu (xem bên dưới)
- 1 Dự án mẫu với 3 task

---

## ⚛️ Cài đặt Frontend

```bash
# Từ thư mục gốc dự án
cd frontend

# Cài đặt dependencies
npm install
```

> **Không cần** tạo file `.env` cho frontend — URL API đã được cấu hình sẵn trỏ đến `http://127.0.0.1:8001`.

---

## ▶️ Khởi chạy hệ thống

### Terminal 1 — Khởi động Backend

```bash
cd backend
.venv\Scripts\activate        # Windows
# hoặc: source .venv/bin/activate   # macOS/Linux

uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

✅ Backend chạy tại: `http://127.0.0.1:8001`  
📖 Swagger UI tại: `http://127.0.0.1:8001/docs`

### Terminal 2 — Khởi động Frontend

```bash
cd frontend
npm run dev
```

✅ Frontend chạy tại: `http://localhost:5173`

---

## 🔑 Tài khoản mặc định

Sau khi chạy `seed_v2.py`, hệ thống có các tài khoản sau:

| Vai trò | Email | Mật khẩu | Quyền hạn |
|---------|-------|----------|-----------|
| **Admin** | `admin@company.com` | `Admin123!` | Toàn quyền hệ thống |
| **Manager** | `manager@company.com` | `Manager123!` | Tạo/sửa/xóa task, duyệt nghỉ phép |
| **Employee** | `employee@company.com` | `Employee123!` | Xem task, upload file, xin nghỉ phép |

> ⚠️ **Bảo mật:** Đổi mật khẩu ngay sau khi đăng nhập lần đầu trong môi trường production.

---

## 📁 Cấu trúc thư mục

```
TaskSyncEnterprise/
│
├── backend/                        # FastAPI Backend
│   ├── app/
│   │   ├── core/                   # JWT, RBAC, dependencies
│   │   ├── crud/                   # Database operations
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── routers/v1/             # API endpoints
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic
│   │   ├── config.py               # ⚙️ Cấu hình hệ thống
│   │   ├── database.py             # Kết nối database
│   │   └── main.py                 # Entry point FastAPI
│   ├── alembic/                    # Database migrations
│   ├── uploads/                    # File uploads (auto-created)
│   ├── seed_v2.py                  # 🌱 Script tạo dữ liệu mẫu
│   ├── requirements.txt            # Python dependencies
│   └── .env                        # 🔐 Biến môi trường (tự tạo)
│
├── frontend/                       # React Vite Frontend
│   ├── src/
│   │   ├── api/                    # Axios configuration
│   │   ├── components/             # Reusable components
│   │   ├── pages/                  # Các trang chính
│   │   │   ├── auth/               # Đăng nhập
│   │   │   ├── dashboard/          # Dashboard chính
│   │   │   ├── tasks/              # Kanban board
│   │   │   ├── employees/          # Quản lý nhân viên
│   │   │   ├── projects/           # Quản lý dự án
│   │   │   ├── vacations/          # Nghỉ phép
│   │   │   ├── calendar/           # Lịch
│   │   │   └── notifications/      # Thông báo
│   │   ├── router/                 # React Router setup
│   │   └── layouts/                # Layout templates
│   ├── package.json
│   └── vite.config.js
│
├── DB_V2.sql                       # 📊 Schema SQL (backup thủ công)
├── .gitignore
└── README.md
```

---

## 🔧 Xử lý lỗi thường gặp

### ❌ `Connection refused` khi kết nối SQL Server
- Mở **SQL Server Configuration Manager** → SQL Server Network Configuration → Protocols → **TCP/IP** → Enable
- Mở **Windows Firewall** → Allow TCP port **1433**
- Khởi động lại service **SQL Server**

### ❌ `Module not found` khi chạy backend
```bash
# Đảm bảo đang trong môi trường ảo
.venv\Scripts\activate
pip install -r requirements.txt
```

### ❌ Frontend báo lỗi `403 Forbidden` hoặc `CORS`
- Kiểm tra Backend đang chạy ở port **8001**
- Kiểm tra `backend/app/config.py` → `BACKEND_CORS_ORIGINS` phải có `http://localhost:5173`

### ❌ Alembic lỗi `Table already exists`
```bash
# Reset migration state
alembic stamp head
alembic upgrade head
```

---

## 📡 API Documentation

Sau khi khởi động backend, truy cập:

- **Swagger UI**: http://127.0.0.1:8001/docs
- **ReDoc**: http://127.0.0.1:8001/redoc

---

## 🛡 Phân quyền (RBAC)

| Endpoint | Admin | Manager | Employee |
|----------|:-----:|:-------:|:--------:|
| Tạo/Xóa Task | ✅ | ✅ | ❌ |
| Cập nhật trạng thái Task | ✅ | ✅ | ✅ (task được giao) |
| Upload file | ✅ | ✅ | ✅ |
| Xóa file | ✅ | ✅ | ✅ (file do mình upload) |
| Duyệt nghỉ phép | ✅ | ✅ | ❌ |
| Xem nhân viên | ✅ | ✅ | ✅ |
| CRUD nhân viên | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |

---

## 👨‍💻 Tác giả

**Huỳnh Lê Thành Nhân**  
GitHub: [@huynhlethanhnhan](https://github.com/huynhlethanhnhan)

---

## 📄 License

MIT License — Tự do sử dụng cho mục đích học tập và phát triển.

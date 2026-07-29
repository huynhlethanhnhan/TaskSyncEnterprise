# TaskSyncEnterprise

TaskSyncEnterprise là nền tảng quản lý công việc và nhân sự doanh nghiệp, tập trung vào Project, Epic/Product Backlog, Sprint, Task, phòng ban, team, nghỉ phép và cộng tác realtime.

## Chức năng chính

- Quản lý phòng ban, team, nhân viên và phân quyền Admin/Manager/Employee.
- Project workspace, Product Backlog, Epic/Topic, Sprint Planning và Task Kanban.
- Giao việc, checklist, bình luận, file đính kèm và avatar.
- Calendar, My Vacation và quy trình duyệt nghỉ phép.
- Topic, Feedback, Notification và cập nhật giữa nhiều trình duyệt qua WebSocket.
- Dashboard, báo cáo, audit log và dữ liệu seed phục vụ demo/test.

## Công nghệ

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query.
- Backend: FastAPI, Python 3.12, SQLAlchemy, Alembic.
- Data: Microsoft SQL Server 2022 và Redis 7.
- Runtime: Docker Compose; production có Nginx, Prometheus và Grafana.

## Yêu cầu

- Git 2.x.
- Python 3.12 và Node.js 22+ nếu chạy local.
- Docker Desktop nếu máy chưa có SQL Server/Redis.
- Tối thiểu 4 GB RAM; nên có 8 GB khi chạy SQL Server bằng Docker.

## Cài đặt nhanh bằng Docker

Docker phù hợp khi máy chưa có SQL Server hoặc không có tài khoản `sa`.

```powershell
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
Copy-Item .env.example .env
```

Mở `.env` và bắt buộc thay:

```dotenv
SECRET_KEY=chuoi-ngau-nhien-toi-thieu-32-ky-tu
MSSQL_SA_PASSWORD=MatKhauManhCuaBan123!
MSSQL_DATABASE=TaskSyncEnterprise
```

Không dùng mật khẩu mẫu và không commit `.env`.

```powershell
docker compose config
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python Seed_Example.py --reset
```

Compose khởi động SQL Server, Redis và backend. Service `sqlserver-init` tự tạo database nếu chưa tồn tại; Alembic tạo schema. `--reset` chỉ dùng cho local/test vì nó xóa dữ liệu ứng dụng trước khi seed.

Base Compose không chạy frontend. Khởi động frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Truy cập:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- Swagger API: `http://127.0.0.1:8000/docs`

## Cài đặt local khi đã có SQL Server

Tạo database nếu chưa có:

```sql
IF DB_ID(N'TaskSyncEnterprise') IS NULL
    CREATE DATABASE [TaskSyncEnterprise];
```

Cấu hình `.env`:

```dotenv
ENVIRONMENT=development
SECRET_KEY=chuoi-ngau-nhien-toi-thieu-32-ky-tu
MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=TaskSyncEnterprise
MSSQL_USER=sa
MSSQL_SA_PASSWORD=mat-khau-sa-thuc-te
REDIS_URL=redis://127.0.0.1:6379/0
```

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe Seed_Example.py --reset
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Nếu health trả `503` nhưng database `connected` và Redis `failed`, SQL Server vẫn hoạt động nhưng Redis chưa chạy. Có thể khởi động Redis bằng:

```powershell
docker compose up -d redis
```

## Kiểm tra

```powershell
cd backend
.\.venv\Scripts\ruff.exe check app tests
.\.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

## Production Docker

```powershell
Copy-Item .env.production.example .env.production
# điền đầy đủ biến bắt buộc trong .env.production
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Production Compose có frontend, backend, Nginx, SQL Server, Redis, Prometheus và Grafana. Không public SQL Server/Redis ra Internet và không đưa file environment vào Git.

## Nhánh

- `master`: bản ổn định, giới thiệu và hướng dẫn cài đặt.
- `develop`: mã đang phát triển cùng tài liệu kiến trúc, learning, audit và roadmap AI.

GitHub áp dụng quyền xem ở cấp repository, không thể đặt riêng `develop` thành nhánh chỉ một người nhìn thấy trong repository public.

## License

[MIT](LICENSE)

# Docker, SQL Server và localhost

## Chọn một trong hai cách chạy

### Cách A — Backend/frontend local, SQL Server có sẵn

Phù hợp khi máy đã cài SQL Server và có tài khoản `sa`.

`.env`:

```dotenv
ENVIRONMENT=development
SECRET_KEY=replace-with-at-least-32-random-characters
MSSQL_HOST=127.0.0.1
MSSQL_PORT=1433
MSSQL_DATABASE=TaskSyncEnterprise
MSSQL_USER=sa
MSSQL_SA_PASSWORD=your-real-local-sa-password
REDIS_URL=redis://127.0.0.1:6379/0
```

Nếu chưa có database:

```sql
IF DB_ID(N'TaskSyncEnterprise') IS NULL
    CREATE DATABASE [TaskSyncEnterprise];
```

Sau đó chạy `alembic upgrade head`. Không chạy seed trước migration.

### Cách B — Không có SQL Server hoặc không có tài khoản `sa`

Docker sẽ tạo SQL Server container và tài khoản `sa` bằng mật khẩu bạn khai báo. Không dùng mật khẩu mẫu.

```powershell
Copy-Item .env.example .env
# sửa SECRET_KEY và MSSQL_SA_PASSWORD trong .env
docker compose config
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python Seed_Example.py --reset
```

Service `sqlserver-init` tự tạo database `TaskSyncEnterprise` nếu chưa có. Named volume `mssql_data` giữ database sau khi container bị xóa.

Base Compose gồm SQL Server, Redis và backend; frontend vẫn chạy bằng `npm run dev` tại `localhost:5173`. Production Compose mới có frontend và Nginx.

## Địa chỉ local

| Thành phần | Native/base Compose | Production Compose |
|---|---:|---:|
| Frontend dev | `http://localhost:5173` | qua Nginx `:80/:443` |
| Backend | `http://127.0.0.1:8000` | chỉ qua Nginx |
| Swagger | `http://127.0.0.1:8000/docs` | tùy cấu hình proxy |
| SQL Server | `127.0.0.1:1433` | nội bộ + port được cấu hình |
| Redis | `127.0.0.1:6379` | nội bộ |

`localhost` chỉ là máy đang chạy dịch vụ. Bên trong container, không dùng `localhost` để gọi container khác; dùng hostname `sqlserver`, `redis`, `backend`.

## Kiểm tra trạng thái

```powershell
docker compose ps
docker compose logs sqlserver
docker compose logs sqlserver-init
docker compose logs backend
curl.exe -i http://127.0.0.1:8000/health/details
```

Health `503` với `database=connected`, `redis=failed` có nghĩa SQL Server đang hoạt động nhưng Redis chưa chạy. Backend có thể phục vụ một số request, nhưng readiness vẫn thất bại.

## Trạng thái đã kiểm tra ngày 2026-07-29

- Docker CLI `29.6.1` và Compose `v5.2.0` đã được cài.
- Docker Desktop Linux engine chưa chạy, nên không thể thực thi container runtime ở thời điểm audit.
- SQL Server native tại `127.0.0.1:1433` kết nối được.
- Database driver: `mssql+pymssql`; database: `TaskSyncEnterprise`.
- Backend health xác nhận database `UP`, Redis `DOWN`.
- Production Compose yêu cầu thêm các biến production trong `.env.production`; `docker compose config` sẽ từ chối nếu thiếu.

## Production

```powershell
Copy-Item .env.production.example .env.production
# điền toàn bộ biến bắt buộc
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Không đưa `.env.production` vào Git. Nginx là public entrypoint; không public trực tiếp SQL Server hoặc Redis trên Internet.

# TaskSyncEnterprise

TaskSyncEnterprise là nền tảng quản lý nhân sự, dự án và công việc theo định
hướng doanh nghiệp. Repository hiện cung cấp backend FastAPI, frontend React,
SQL Server, Redis và hạ tầng quan sát bằng Prometheus. Phase 3.7.5 đã hoàn tất
runtime validation; Grafana chưa được triển khai.

## Công nghệ đã triển khai

- FastAPI trên Python 3.12.
- SQLAlchemy 2 và Pydantic v2.
- Microsoft SQL Server và driver `pymssql`.
- Redis cho cache, rate limiting và idempotency state.
- Docker Compose cho backend, SQL Server, Redis và Prometheus.
- Prometheus metrics và Prometheus Server 3.13.1.
- OpenTelemetry cho FastAPI, SQLAlchemy, Redis và structured tracing.
- Alembic cho database migrations.
- Pytest cho backend tests.
- React 19 và Vite cho frontend.

## Chức năng chính

Các phần sau có implementation và test/code tương ứng trong repository:

- Authentication, JWT access/refresh token, logout và đổi mật khẩu.
- Role-based access control cho admin, manager và employee.
- Quản lý employee, department, team và role.
- Quản lý project, task và task attachment.
- Vacation workflows.
- Notification preferences, in-app notification, WebSocket và email retry
  infrastructure.
- Redis caching và cache invalidation.
- Liveness, readiness và detailed health checks.
- Structured logging và audit logging.
- Prometheus metrics và OpenTelemetry instrumentation.
- API versioning, deprecation, rate limiting và idempotency middleware.
- Background email retry poller.

## Kiến trúc tổng quan

```text
Client / Frontend
       |
       v
FastAPI Backend :8000
       |---- SQL Server :1433
       |---- Redis :6379
       |---- /metrics
                    ^
                    |
             Prometheus :9090
```

### Hai mô hình SQL Server

SQL Server cài trực tiếp trên Windows và SQL Server chạy trong Docker là hai môi
trường kết nối khác nhau:

| Môi trường | Authentication | Host từ backend |
|---|---|---|
| SQL Server trên Windows | Có thể dùng Windows Authentication theo cấu hình máy | Thường là `127.0.0.1` hoặc hostname Windows khi backend chạy local |
| SQL Server trong Docker Compose | SQL Server Authentication | `sqlserver` khi backend chạy trong cùng Compose network |

Docker stack sử dụng:

```text
Host/service: sqlserver
User:         sa
Database:     TaskSyncEnterprise
Password:     <your-local-development-password>
```

Không dùng `localhost`, Windows machine name hoặc Windows Integrated Security
trong connection string của backend container. `localhost` bên trong backend
container chỉ trỏ về chính container backend.

## Cấu trúc repository

```text
TaskSyncEnterprise/
|-- backend/
|   |-- app/                 # FastAPI application
|   |-- alembic/             # Alembic migration scripts
|   |-- tests/               # Pytest suites
|   |-- Dockerfile
|   |-- requirements.txt
|   `-- alembic.ini
|-- frontend/                # React/Vite frontend
|-- monitoring/
|   `-- prometheus/
|       `-- prometheus.yml
|-- docs/                    # Guides, architecture notes and reports
|-- reports/                 # Historical audit/performance/testing reports
|-- roadmap/                 # Project roadmap documents
|-- docker-compose.yml       # Backend, Redis and SQL Server
|-- docker-compose.monitoring.yml
|-- .env.example
`-- README.md
```

## Cấu hình môi trường

### A. Clone và tạo `.env`

Tải repository và chuẩn bị file cấu hình môi trường:

```powershell
git clone https://github.com/huynhlethanhnhan/TaskSyncEnterprise.git
cd TaskSyncEnterprise
git switch develop
Copy-Item .env.example .env
```

`.env` đã được ignore bởi Git. Không commit file này để đảm bảo an toàn bảo mật.

Chỉnh sửa file `.env` local của bạn để khai báo thông tin đăng nhập phát triển:

```env
MSSQL_SA_PASSWORD=ThanhNhan1807!
DATABASE_URL=mssql+pymssql://sa:ThanhNhan1807!@sqlserver:1433/TaskSyncEnterprise
```

> [!IMPORTANT]
> Mật khẩu trong `DATABASE_URL` **phải khớp hoàn toàn** với giá trị của `MSSQL_SA_PASSWORD`. Không sử dụng mật khẩu mặc định/phát triển này cho môi trường staging hoặc production.

| Key | Mục đích |
|---|---|
| `ENVIRONMENT` | `development`, `testing` hoặc `production` (production bật validation nghiêm ngặt hơn) |
| `SECRET_KEY` | Ký mã hóa JWT; production phải dùng một chuỗi ngẫu nhiên tối thiểu 32 ký tự |
| `MSSQL_SA_PASSWORD` | Mật khẩu tài khoản `sa` của SQL Server Docker container |
| `DATABASE_URL` | SQLAlchemy URL kết nối cơ sở dữ liệu; mật khẩu phải khớp `MSSQL_SA_PASSWORD` |
| `REDIS_URL` | Redis connection URL; Docker sử dụng hostname `redis` |
| `PROMETHEUS_BIND_ADDRESS` | Địa chỉ binding của Prometheus Server; mặc định an toàn là `127.0.0.1` |

---

## Các luồng chạy ứng dụng local

### Luồng A — Chạy toàn bộ bằng Docker (Khuyến nghị)

Trong chế độ này, toàn bộ ứng dụng (FastAPI Backend, SQL Server, Redis, Prometheus) chạy bên trong các container thuộc cùng một Docker network.

*   `DATABASE_URL` host trỏ đến: `sqlserver`
*   `REDIS_URL` host trỏ đến: `redis`

#### 1. Validate cấu hình
```powershell
docker compose config --quiet
docker compose -f docker-compose.monitoring.yml config
```

#### 2. Khởi động toàn bộ container
```powershell
docker compose up -d --build
docker compose ps
```

#### 3. Kiểm tra trạng thái và validation
Xác minh các endpoint hoạt động (sử dụng PowerShell):
```powershell
Invoke-RestMethod http://localhost:8000/health
(Invoke-WebRequest http://localhost:8000/docs -TimeoutSec 10).StatusCode
(Invoke-WebRequest http://localhost:8000/metrics -TimeoutSec 10).StatusCode
```
Hoặc dùng `curl`:
```powershell
curl.exe -I --max-time 10 http://localhost:8000/docs
curl.exe -I --max-time 10 http://localhost:8000/metrics
```

---

### Luồng B — SQL Server/Redis trong Docker, Backend chạy local trên Windows

Chế độ này tối ưu cho việc debug mã nguồn backend Python trực tiếp bằng debugger IDE trên máy host Windows.

*   `DATABASE_URL` host trỏ đến: `127.0.0.1`
*   `REDIS_URL` host trỏ đến: `127.0.0.1`

> [!WARNING]
> Không chạy backend Docker và backend local đồng thời trên port `8000` để tránh tranh chấp cổng.

#### 1. Dừng container backend Docker (nếu đang chạy)
```powershell
docker compose stop backend
```

#### 2. Khởi động các cơ sở hạ tầng (SQL Server và Redis)
```powershell
docker compose up -d sqlserver redis
```

#### 3. Chạy ứng dụng Python backend từ máy host
Sử dụng các biến môi trường cấu hình trỏ về localhost (`127.0.0.1`):
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

$env:ENVIRONMENT = "development"
$env:SECRET_KEY = "replace-with-a-strong-random-secret-at-least-32-characters"
$env:DATABASE_URL = "mssql+pymssql://sa:ThanhNhan1807!@127.0.0.1:1433/TaskSyncEnterprise"
$env:REDIS_URL = "redis://127.0.0.1:6379/0"

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Khởi tạo và đồng bộ Database (Migrations)

Nếu chạy lần đầu hoặc sau khi dọn sạch volume, bạn cần tạo cơ sở dữ liệu trống và chạy migration.

#### 1. Khởi tạo Database trống trong SQL Server
Chạy lệnh `sqlcmd` trực tiếp vào container:
```powershell
docker exec tasksync-sqlserver `
  /opt/mssql-tools18/bin/sqlcmd `
  -S localhost `
  -U sa `
  -P "ThanhNhan1807!" `
  -C `
  -Q "IF DB_ID('TaskSyncEnterprise') IS NULL CREATE DATABASE [TaskSyncEnterprise]"
```

#### 2. Chạy migrations bằng Alembic
```powershell
# Nếu dùng backend Docker:
docker compose exec backend alembic upgrade head

# Nếu dùng backend local:
alembic upgrade head
```

---

## Hướng dẫn Troubleshooting lỗi 18456 State 8

Thông báo lỗi:
```text
Error: 18456, Severity: 14, State: 8
Login failed for user 'sa'
Reason: Password did not match that for the login provided.
```

**State 8** nghĩa là mật khẩu cung cấp để đăng nhập tài khoản `sa` không khớp với mật khẩu đang lưu trữ bên trong cơ sở dữ liệu SQL Server.

### Các nguyên nhân phổ biến và cách sửa:

1.  **Mật khẩu không khớp giữa các biến:** Mật khẩu trong biến `MSSQL_SA_PASSWORD` và phần mật khẩu trong `DATABASE_URL` (hoặc cấu hình local của Windows) bị lệch ký tự. Kiểm tra và đồng bộ lại.
2.  **Container sử dụng cấu hình cũ:** Sau khi cập nhật `.env`, container backend không tự động cập nhật nếu không được dựng lại. Chạy lệnh tái tạo container:
    ```powershell
    docker compose up -d --build --force-recreate
    ```
3.  **Volume cũ lưu mật khẩu cũ:** SQL Server Docker container chỉ thiết lập mật khẩu `sa` vào volume ở **lần đầu tiên** khởi tạo dữ liệu. Thay đổi `MSSQL_SA_PASSWORD` sau đó sẽ không tự cập nhật mật khẩu lưu trong volume.
    *   **Cách giải quyết:** Thực hiện reset volume local (Lưu ý: lệnh này sẽ xóa toàn bộ dữ liệu database hiện tại trong Docker):
        ```powershell
        docker compose down -v --remove-orphans
        docker compose up -d sqlserver redis
        ```
4.  **Nhầm lẫn Host kết nối:** Backend chạy local trên Windows dùng `sqlserver` (hostname của Docker) thay vì `127.0.0.1`.
5.  **Biến môi trường Windows bị đè:** Biến môi trường hệ thống Windows cũ đè lên file `.env` local.

### Các lệnh kiểm tra cấu hình thực tế:
Kiểm tra biến môi trường đã render vào container:
```powershell
docker inspect tasksync-sqlserver --format '{{range .Config.Env}}{{println .}}{{end}}'
docker inspect tasksync-backend --format '{{range .Config.Env}}{{println .}}{{end}}'
```

Kiểm tra nhật ký lỗi đăng nhập:
```powershell
docker compose logs sqlserver --tail 100
```


### Frontend local

Frontend không nằm trong Docker Compose hiện tại. Vite sử dụng port mặc định khi
không có override trong `frontend/vite.config.js`.

```powershell
cd frontend
npm ci
npm run dev
```

Các lệnh frontend khác có trong `frontend/package.json`:

```powershell
npm run lint
npm run build
npm run preview
```

## Database và migrations

Xem revision hiện tại:

```powershell
docker compose -f docker-compose.yml run --rm backend `
  python -m alembic current
```

Upgrade tới head:

```powershell
docker compose -f docker-compose.yml run --rm backend `
  python -m alembic upgrade head
```

Alembic tạo hoặc cập nhật tables trong một database đã tồn tại. Alembic không
tạo SQL Server database `TaskSyncEnterprise`.

## API access

Khi backend chạy trên port mặc định:

| URL | Mục đích |
|---|---|
| `http://localhost:8000` | Root API response |
| `http://localhost:8000/docs` | Swagger UI |
| `http://localhost:8000/redoc` | ReDoc |
| `http://localhost:8000/health` | Lightweight health check |
| `http://localhost:8000/health/live` | Liveness probe |
| `http://localhost:8000/health/ready` | Database/Redis readiness probe |
| `http://localhost:8000/health/details` | Detailed operational health |
| `http://localhost:8000/metrics` | Prometheus exposition endpoint |

Business APIs được mount dưới prefix `http://localhost:8000/api/v1`.

## Prometheus

Prometheus chạy bằng [docker-compose.monitoring.yml](docker-compose.monitoring.yml)
và scrape backend qua `host.docker.internal:8000/metrics`.

| URL | Mục đích |
|---|---|
| `http://localhost:9090` | Prometheus UI |
| `http://localhost:9090/targets` | Target status |
| `http://localhost:9090/-/ready` | Readiness |
| `http://localhost:9090/-/healthy` | Health |

PromQL hữu ích đã được xác nhận bởi config/runtime hoặc backend metrics:

```promql
up{job="tasksync-backend"}
scrape_duration_seconds{job="tasksync-backend"}
scrape_samples_scraped{job="tasksync-backend"}
process_resident_memory_bytes
rate(http_requests_total[5m])
```

Tạo traffic tới backend trước khi query `rate(http_requests_total[5m])`.
Hướng dẫn chi tiết nằm tại
[docs/monitoring/prometheus_setup.md](docs/monitoring/prometheus_setup.md).

## Health và logs

```powershell
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.monitoring.yml ps

docker compose -f docker-compose.yml logs --tail 100 backend
docker compose -f docker-compose.yml logs --tail 100 sqlserver
docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus
```

Kiểm tra trực tiếp:

```powershell
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8000/metrics
Invoke-WebRequest http://localhost:9090/-/ready
Invoke-WebRequest http://localhost:9090/-/healthy
```

## Stop và restart an toàn

`down` không có `-v` sẽ remove containers/networks của Compose file nhưng giữ
named volumes:

```powershell
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.yml down
```

Restart service đang tồn tại:

```powershell
docker compose -f docker-compose.yml restart backend
docker compose -f docker-compose.monitoring.yml restart prometheus
```

Không dùng các lệnh sau trong workflow thông thường:

```powershell
docker compose down -v
docker volume prune
docker system prune -a
```

Các lệnh này có thể xóa SQL Server, Redis, Prometheus data hoặc tài nguyên của
repository khác.

## Docker cleanup an toàn

Luôn inventory trước:

```powershell
docker ps -a
docker image ls
docker volume ls
docker network ls
docker compose ls
```

Chỉ remove container sau khi inspect và chứng minh nó stopped, thuộc
TaskSyncEnterprise, không còn được Compose tham chiếu và không chứa persistent
data:

```powershell
docker inspect <verified-stopped-container>
docker rm <verified-stopped-container>
```

Chỉ dọn dangling images sau khi xác nhận không image cần thiết nào bị ảnh hưởng:

```powershell
docker image ls --filter dangling=true
docker image prune
```

Volumes chứa dữ liệu lâu dài. Các volume hiện được bảo vệ gồm:

```text
tasksyncenterprise_mssql_data
tasksyncenterprise_redis_data
tasksync-prometheus-data
```

Không dùng broad prune như một thao tác bảo trì mặc định. Xem báo cáo audit tại
[docs/reports/docker_cleanup_audit.md](docs/reports/docker_cleanup_audit.md).

## Troubleshooting

### SQL Server unhealthy: sai đường dẫn sqlcmd

Triệu chứng:

```text
/opt/mssql-tools/bin/sqlcmd does not exist
```

SQL Server 2022 image hiện dùng:

```text
/opt/mssql-tools18/bin/sqlcmd
```

### SQL Server certificate failure

Triệu chứng:

```text
certificate verify failed:self-signed certificate
```

ODBC Driver 18 validate encryption certificate mặc định. Local container dùng
self-signed certificate nên healthcheck cần `-C` như một argument riêng.

### Backend thiếu email validator

Triệu chứng:

```text
email-validator is not installed
```

Đảm bảo `email-validator` có trong `backend/requirements.txt`, sau đó rebuild:

```powershell
docker compose -f docker-compose.yml build backend
docker compose -f docker-compose.yml up -d --force-recreate backend
```

### Production SECRET_KEY validation failure

Triệu chứng:

```text
SECRET_KEY is using the default development fallback
```

Local testing dùng `ENVIRONMENT=development`. Production phải cung cấp
`SECRET_KEY` riêng, ngẫu nhiên và tối thiểu 32 ký tự.

### Database missing

Triệu chứng:

```text
Cannot open database TaskSyncEnterprise
```

Tạo database rỗng bằng lệnh ở phần Quick Start, sau đó chạy
`python -m alembic upgrade head`. Không tạo schema thủ công.

### Container name conflict

Triệu chứng:

```text
container name is already in use
```

Inspect container cũ. Chỉ remove nếu nó stopped, obsolete, thuộc đúng project và
không chứa persistent data:

```powershell
docker inspect <container-name>
docker rm <verified-obsolete-stopped-container>
```

### Prometheus không start với `unexpected false`

Prometheus v3.13.1 không chấp nhận `--web.enable-lifecycle=false`. Lifecycle API
đã disabled mặc định; bỏ flag false-valued thay vì bật API.

### Prometheus target DOWN

Kiểm tra theo thứ tự:

1. `http://localhost:8000/metrics` trả HTTP 200.
2. Backend publish port 8000.
3. `host.docker.internal` resolve từ container Prometheus.
4. `docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus`.
5. Firewall/proxy không chặn đường scrape.

## Testing

Backend tests dùng Pytest và fixture SQLite/mock Redis/SMTP cho các suite phù
hợp. Chạy từ virtual environment đã cài dependencies:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

Chạy một file cụ thể khi debug:

```powershell
python -m pytest tests/test_health.py -v
```

Không suy ra số test pass từ tài liệu; sử dụng output của lần chạy hiện tại.

## Development workflow

Repository và development standards hiện dùng:

- `master`: code ổn định/release; chỉ nhận thay đổi đã được promote từ `develop`.
- `develop`: integration branch cho active development và validation.
- `feature/*`: branch ngắn hạn tách từ `develop`, merge lại qua Pull Request.
- `bugfix/*`: branch ngắn hạn cho bug cụ thể.

Không commit trực tiếp lên `master`. Tuân theo review/PR policy trong
`docs/reports/enterprise_development_standards.md`.

## Trạng thái dự án

| Phase | Trạng thái |
|---|---|
| Phase 3.7.5 — Prometheus Server | Complete; runtime validation passed |
| Phase 3.7.6 — Grafana | Pending; chưa triển khai |
| Phase 3.7.7 — Monitoring dashboards and alerts | Pending |
| Phase 3.8 — CI/CD and production hardening | Pending |

Bằng chứng runtime mới nhất:
[docs/reports/phase_3_7_5_runtime_validation.md](docs/reports/phase_3_7_5_runtime_validation.md).

## Security notes

- Không commit `.env`, passwords, tokens, connection strings thật hoặc private
  keys.
- Không dùng development password hay `sa` trong production.
- Production phải có `SECRET_KEY` riêng và lưu secrets trong managed secret
  storage.
- Prometheus không có authentication trong stack hiện tại; giữ binding
  `127.0.0.1` hoặc đặt sau private network/authenticated reverse proxy.
- Hạn chế SQL Server, Redis và backend ports bằng firewall/private networks ở
  production.
- Review Docker resources trước khi cleanup; không xóa volume nếu chưa có backup
  và phê duyệt rõ ràng.

## Đóng góp và giấy phép

Tạo feature/bugfix branch từ `develop`, bổ sung hoặc cập nhật tests, chạy các
validation liên quan, sau đó mở Pull Request về `develop`. Không đưa secrets hoặc
generated artifacts vào commit.

Dự án được cấp phép theo [MIT License](LICENSE). Copyright (c) 2026
TaskSyncEnterprise Contributors.

# Hướng dẫn dữ liệu mẫu `Seed_Example`

Nguồn dữ liệu demo chuẩn nằm tại `backend/Seed_Example.py`. `backend/seed_v2.py` chỉ là entry point tương thích cho workflow cũ và luôn gọi seed ở chế độ reset.

## Dataset hiện tại

| Nhóm dữ liệu | Số lượng |
|---|---:|
| Vai trò | 3 |
| Phòng ban | 7 |
| Team | 14 |
| Nhân viên | 37 |
| Admin | 2 |
| Manager | 7 |
| Employee | 28 |
| Dự án | 12 |
| Task | 72 |
| Notification | 111 |
| Đơn nghỉ | 14 |

Dataset có tên và nội dung tiếng Việt, deadline quá hạn/còn hạn, ba trạng thái task, project membership, assignment, checklist, comment, notification preference và notification timestamps tương đối theo UTC lúc chạy seed.

## Tài khoản đại diện

Tất cả dùng mật khẩu demo `TaskSync@2026`.

| Vai trò | Email |
|---|---|
| Admin | `admin@tasksync.example.com` |
| Admin vận hành | `operations.admin@tasksync.example.com` |
| Manager IT | `manager.it@tasksync.example.com` |
| Employee — Huỳnh Lê Thành Nhân | `employee001@tasksync.example.com` |

Các email dùng miền `example.com` hợp lệ với Pydantic `EmailStr` nhưng không gửi mail ra người thật.

## Chạy với Docker production

Tạo database và chạy migration trước. Từ thư mục gốc repository:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint alembic backend upgrade head
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint python backend Seed_Example.py
```

Nếu database demo đã có dữ liệu và bạn thực sự muốn thay toàn bộ dữ liệu ứng dụng:

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps --entrypoint python backend Seed_Example.py --reset
```

## Chạy local

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
python Seed_Example.py
```

Các biến `DATABASE_URL` và `REDIS_URL` phải trỏ đúng môi trường cần seed. Script không tự chọn database.

## Cơ chế an toàn

- Mặc định script dừng nếu bảng `employees` đã có dữ liệu.
- `--reset` xóa dữ liệu ứng dụng theo dependency metadata rồi nạp lại toàn bộ dataset.
- `--reset` không drop database, không xóa Alembic history và không xóa Docker volume.
- Không chạy `--reset` trên production có dữ liệu người dùng.
- Mọi thay đổi schema phải đi qua migration; seed chỉ tạo dữ liệu.

## Kiểm tra dataset

```powershell
cd backend
python tests/test_seed_example_contract.py
python tests/test_query_engine_default_sort.py
```

Kiểm tra runtime qua API sau khi đăng nhập:

- `/api/v1/dashboard/analytics` phải trả 37 nhân viên, 72 task, 7 phòng ban và 7 hàng workload.
- `/api/v1/notifications` phải trả notification mới nhất trước và timestamp có hậu tố UTC `Z`.
- Employee không được đọc notification của người khác; admin được phép override.

## Khi cần mở rộng dữ liệu

Chỉnh các hằng `DEPARTMENTS`, `MANAGERS`, `STAFF_BY_DEPARTMENT`, `PROJECT_NAMES` hoặc `TASK_TEMPLATES` trong `Seed_Example.py`, sau đó cập nhật `EXPECTED_COUNTS` thông qua cấu trúc hiện có và chạy contract test. Không hard-code số giả ở React; Dashboard phải lấy aggregation từ API/SQL.

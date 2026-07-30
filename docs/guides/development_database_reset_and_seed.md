# 📖 Hướng Dẫn Reset Cơ Sở Dữ Liệu Phát Triển & Nạp Dữ Liệu Mẫu (Seed Data)

Tài liệu này hướng dẫn chi tiết quy trình dọn dẹp (reset) cơ sở dữ liệu phát triển an toàn và khởi tạo lại bộ dữ liệu mẫu quy mô lớn (Deterministic Seed Dataset) cho dự án **TaskSyncEnterprise**.

---

## 🛡️ Cờ Bảo Vệ An Toàn (Safety Controls)

Để ngăn chặn việc vô tình xóa dữ liệu trên môi trường Production, công cụ CLI `seed_runner` được tích hợp các cơ chế kiểm soát nghiêm ngặt:

1. **Kiểm tra Môi trường (`ENVIRONMENT`)**:
   - Mặc định chỉ cho phép reset khi `ENVIRONMENT=development` hoặc khi cờ môi trường `ALLOW_DATABASE_RESET=true` được thiết lập rõ ràng.
   - Nếu phát hiện `ENVIRONMENT=production` mà không có cờ cho phép, câu lệnh sẽ lập tức dừng và trả về lỗi bảo mật.
2. **Cờ Xác nhận Bắt buộc (`--confirm-reset`)**:
   - Việc xóa dữ liệu bắt buộc phải kèm theo cờ `--confirm-reset`.

---

## 🚀 Các Câu Lệnh CLI Thường Dùng

Tất cả các câu lệnh được thực thi từ thư mục `backend/` với môi trường ảo Python:

### 1. Reset Cơ sở dữ liệu & Nạp lại Dữ liệu mẫu (Khuyến nghị sử dụng hàng ngày)
```bash
# Trên Windows PowerShell / Command Prompt
cd backend
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m app.seeds.seed_runner --reset-and-seed --confirm-reset
```

### 2. Chỉ Reset Dữ liệu (Không nạp seed)
```bash
cd backend
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m app.seeds.seed_runner --reset --confirm-reset
```

### 3. Chỉ Nạp Dữ liệu Seed (Không xóa dữ liệu cũ)
```bash
cd backend
$env:PYTHONPATH="."
.\.venv\Scripts\python.exe -m app.seeds.seed_runner --seed
```

---

## 📊 Cấu Trúc Bộ Dữ Liệu Mẫu (Seed Dataset Specs)

Bộ seed data được khởi tạo hoàn toàn **Deterministic** (sử dụng cố định `random.seed(2026)`):

| Thành phần | Số lượng / Mô tả |
| :--- | :--- |
| **Roles** | 3 Vai trò hệ thống (`Admin` id=1, `Manager` id=2, `Employee` id=3) |
| **Departments** | 5 Phòng ban (`DEP-IT`, `DEP-HR`, `DEP-FIN`, `DEP-MKT`, `DEP-OPS`) |
| **Employees** | 32 Tài khoản nhân sự (2 Admin, 5 Manager, 25 Employee) |
| **Projects** | 8 Dự án (2 Planned, 3 Active, 2 Completed, 1 On Hold) bao gồm `PRJ-SPRINT-TEST` |
| **Sprints** | 14+ Sprints (Bao gồm `Sprint A` Completed, `Sprint B` Planned Eligible, `Sprint C` Planned Conflict) |
| **Tasks** | 99+ Tasks (25 To Do, 25 In Progress, 15 Review, 10 Blocked, 25 Done) |
| **Test Tasks** | `EMP001-TASK-001` đến `EMP001-TASK-005` gán cho `employee001` |
| **Comments** | 100+ Bình luận trên các công việc |
| **Notifications**| 50+ Thông báo (Read & Unread) |
| **Vacations** | 22 Đơn xin nghỉ phép (Pending, Approved, Rejected, Withdrawn) |
| **Settings** | Cấu hình hệ thống và cài đặt cá nhân cho 32 nhân sự |

---

## 🔑 Tài Khoản Kiểm Thử Phát Triển

Mật khẩu mặc định cho tất cả các tài khoản kiểm thử là: **`TaskSync@2026`**

- **Quản trị viên (Admin)**: `admin001@enterprise.com`
- **Quản lý dự án (Manager)**: `manager001@enterprise.com`
- **Nhân viên (Employee)**: `employee001@enterprise.com`

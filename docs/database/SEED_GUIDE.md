# Hướng Dẫn Sử Dụng Dữ Liệu Mẫu (Seed Data Guide)

Tài liệu này hướng dẫn chi tiết cách chạy và quản lý dữ liệu mẫu (Seed Data) phục vụ cho quá trình phát triển (development) và kiểm thử (testing) dự án `TaskSyncEnterprise`.

---

## 🚀 1. Hướng Dẫn Chạy Seed Script (How to Run)

Dự án sử dụng script seed tập trung tại [backend/seed_v2.py](file:///e:/TaskSyncEnterprise/backend/seed_v2.py). Script này sẽ tự động xóa sạch dữ liệu cũ và chèn dữ liệu mẫu chuẩn hóa theo đúng trình tự phụ thuộc ràng buộc khóa ngoại (Foreign Key Constraints).

### Bước chuẩn bị bắt buộc (Prerequisites)
Trước khi chạy script seed, đảm bảo:
1.  **Cơ sở dữ liệu trống đã được tạo** trên SQL Server (Ví dụ tên DB: `TaskSyncEnterprise`).
2.  **Cấu trúc bảng đã được khởi tạo đầy đủ** bằng cách chạy migrations Alembic:
    ```powershell
    # Nếu chạy Docker:
    docker compose exec backend alembic upgrade head

    # Nếu chạy cục bộ:
    alembic upgrade head
    ```

### Luồng A — Khởi chạy trong môi trường Docker (Khuyến nghị)
Thực thi lệnh sau trực tiếp từ thư mục gốc của repository:
```powershell
docker compose exec backend python seed_v2.py
```

### Luồng B — Khởi chạy cục bộ (Local Environment)
Kích hoạt môi trường ảo Python trong thư mục `backend/` và thực thi:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python seed_v2.py
```

---

## 🧬 2. Phân Tích Chiến Lược Seed Dữ Liệu (Seed Strategy & Dependency Order)

Microsoft SQL Server kiểm soát nghiêm ngặt tính toàn vẹn của dữ liệu thông qua các ràng buộc khóa ngoại. Do đó, script seed thực hiện thao tác xóa dữ liệu cũ và chèn dữ liệu mới theo thứ tự cực kỳ chi tiết:

### Thứ tự xóa dữ liệu cũ (Cleanup Order - Từ bảng con đến bảng cha)
Để tránh lỗi `FK Violation`, dữ liệu cũ được dọn dẹp theo thứ tự từ bảng chứa khóa ngoại phụ thuộc nhiều nhất ngược dần lên:
1.  `TaskAssignment` & `TaskChecklist` & `TaskComment` (Bảng con của Task)
2.  `Task` (Bảng con của Project)
3.  `ProjectMember` (Bảng liên kết nhiều-nhiều giữa Project và Employee)
4.  `Project` (Bảng con của Employee)
5.  `Vacation` (Bảng con của Employee)
6.  `Notification` & `AuditLog` (Bảng con của Employee)
7.  `Employee` (Bảng con của Role/Department/Manager)
8.  `Team` (Bảng con của Department)
9.  `Department` (Bảng độc lập)
10. `Role` (Bảng hệ thống)

### Thứ tự chèn dữ liệu mới (Seeding Order - Từ bảng cha đến bảng con)
Sau khi dọn sạch cơ sở dữ liệu, script sẽ lần lượt chèn dữ liệu mới:
1.  **Roles (Vai trò hệ thống):** Cung cấp 3 vai trò chính với ID tĩnh:
    *   `admin` (ID: 1) - Quyền quản trị tối cao.
    *   `manager` (ID: 2) - Trưởng bộ phận, quản lý dự án.
    *   `employee` (ID: 3) - Nhân viên bình thường.
2.  **Departments (Phòng ban):** Khởi tạo phòng ban `Information Technology` (Mã: `IT`).
3.  **Employees (Nhân sự mẫu):** Khởi tạo 3 tài khoản đại diện:
    *   *System Admin:* Email `admin@gmail.com` (Role ID 1).
    *   *Project Manager:* Email `manager@gmail.com` (Role ID 2, phòng ban IT, quản lý trực tiếp bởi Admin).
    *   *Huỳnh Lê Thành Nhân:* Email `demo1@gmail.com` (Role ID 3, phòng ban IT, quản lý trực tiếp bởi Manager).
    *   *Mật khẩu mặc định:* Tất cả tài khoản sử dụng mật khẩu `123456` (được băm bcrypt bảo mật trước khi lưu).
4.  **Projects (Dự án):** Khởi tạo dự án `IT Project V2` (Mã: `PRJ_IT_001`), gán người tạo là Admin.
5.  **Project Members:** Đăng ký cả Project Manager và Employee (Huỳnh Lê Thành Nhân) vào dự án này.
6.  **Tasks (Công việc & Trạng thái):** Tạo ra 3 công việc mẫu đại diện cho 3 trạng thái của quy trình Kanban doanh nghiệp:
    *   *Task 1 (Done):* "Tích hợp luồng xác thực JWT" - Gán cho Employee.
    *   *Task 2 (In Progress):* "Tái cấu trúc UI Dashboard Figma" - Gán cho Employee, có kèm checklist con đang hoàn thành dở dang (40%).
    *   *Task 3 (To Do):* "Xác minh lược đồ cơ sở dữ liệu SQL Server" - Gán cho Manager.

---

## 📈 3. Đề Xuất Phát Triển Seed Strategy (Future Recommendations)

Để nâng cấp hệ thống seed trong các phase tiếp theo, chúng ta nên cân nhắc:
1.  **Dynamic Date Generation:** Thay vì sử dụng ngày cứng nhắc, hãy sử dụng các khoảng thời gian tương đối (ví dụ: `now() - 3 days`, `now() + 7 days`) để dữ liệu kiểm thử luôn "tươi" và không bị hết hạn (đặc biệt là đơn nghỉ phép Vacation).
2.  **Seeding Scale (Dữ liệu lớn):** Phát triển thêm flag `--scale [small|medium|large]` sử dụng thư viện sinh dữ liệu giả như `Faker` để sinh hàng ngàn bản ghi phục vụ cho việc kiểm thử hiệu năng (Performance load tests) và phân trang.
3.  **Environment Guards:** Tích hợp kiểm tra bảo vệ môi trường: Chỉ cho phép chạy seed nếu `ENVIRONMENT` trong `.env` là `development` hoặc `testing`. Ngăn chặn hoàn toàn việc vô tình chạy seed xóa sạch database trên môi trường `production`.

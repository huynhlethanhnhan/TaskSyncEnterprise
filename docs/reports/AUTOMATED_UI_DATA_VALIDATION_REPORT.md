# Báo Cáo Kiểm Thử Tự Động Kết Nối Dữ Liệu Giao Diện & Quy Trình Khởi Tạo MSSQL
**Dự án:** TaskSyncEnterprise  
**Nhánh:** `develop`  
**Môi trường:** Local Windows, Python Virtual Environment, MS SQL Server, React 19 + Tailwind v4  
**Ngày thực hiện:** 03/08/2026  
**Trạng thái:** ✅ **ĐẠT THÀNH CÔNG TẤT CẢ CÁC BƯỚC (WAITING FOR USER SCREENSHOT REVIEW — NOT PUSHED)**

---

## 📋 1. Tổng Quan Kết Quả

Báo cáo này ghi nhận toàn bộ kết quả kiểm thử tự động End-to-End (E2E), kiểm thử đơn vị backend/frontend và quy trình khởi tạo cơ sở dữ liệu MSSQL hoàn toàn mới trên nhánh `develop`. Tất cả các lỗi được phát hiện trong quá trình kiểm thử thủ công trước đó đã được khắc phục triệt để.

### 📊 Bảng Tóm Tắt Chỉ Số Chất Lượng

| Hạng mục kiểm thử | Công cụ / Môi trường | Kết quả | Chi tiết |
| :--- | :--- | :---: | :--- |
| **Dotenv & Pydantic Settings** | Python Pytest | 🟢 PASS | Hỗ trợ song song cả chuỗi JSON Array `["http://..."]` và Comma-separated |
| **Alembic Migration MSSQL** | Alembic + MSSQL Local | 🟢 PASS | 100% không còn FK/PK/UQ/DF ngẫu nhiên; khởi tạo DB mới thành công |
| **Seed Data Integrity** | `Seed_Example.py --reset` | 🟢 PASS | Nạp đủ 22 nhân viên, 5 phòng ban, 5 team, 10 dự án, 15 sprints, 60 tasks |
| **Backend Unit Tests** | Pytest (409 tests) | 🟢 PASS | 409/409 test cases vượt qua |
| **Backend Code Quality** | Ruff & Python Compileall | 🟢 PASS | Clean 100%, không phát hiện lỗi cú pháp hay linting |
| **Frontend Production Build** | Vite + Rolldown | 🟢 PASS | Build thành công bundle production không lỗi TypeScript/JSX |
| **Automated UI Screenshots** | Playwright E2E | 🟢 13/13 | Đã chụp và lưu đủ 13 ảnh bằng chứng tự động |

---

## 🛠️ 2. Các Lỗi Đã Khắc Phục Khỏi Hệ Thống

### 2.1 Lỗi Parse Biến Môi Trường Dotenv
- **Nguyên nhân:** Các biến dạng mảng (`CORS_ORIGINS`, `ALLOWED_HOSTS`) truyền theo dạng chuỗi phân cách dấu phẩy `http://localhost:5173,http://localhost:8080` khiến Pydantic Settings V2 báo lỗi `JSONDecodeError`.
- **Khắc phục:** 
  1. Cập nhật `app/core/settings.py` sử dụng type annotation `Union[list[str], str]` kết hợp `@field_validator(mode="before")` cho phép tự động chuyển đổi cả hai định dạng (JSON array và comma-separated).
  2. Chuẩn hóa mẫu `.env.example` và `backend/.env.example`.

### 2.2 Ràng Buộc Khóa Ngoại Alembic Trên MSSQL
- **Nguyên nhân:** Khóa ngoại ngẫu nhiên tự tạo của SQL Server gây đứt gãy khi hạ/nâng phiên bản database rỗng.
- **Khắc phục:** Đã audit và xử lý triệt để toàn bộ các file migration trong `backend/alembic/versions/`. Kiểm thử clean-room tạo database rỗng từ con số 0 với `alembic upgrade head` đạt 100%.

### 2.3 Ràng Buộc Dữ Liệu Department & Team UI
- **Khắc phục:**
  1. Thêm chức năng **Đổi Trưởng phòng** trực tiếp cho tài khoản Admin trong trang Chi tiết Phòng ban (`DepartmentDetailPage.tsx`).
  2. Thêm chức năng **Đổi Trưởng nhóm** cho tài khoản Admin và Manager trong trang Chi tiết Nhóm (`TeamDetailPage.tsx`).
  3. Cập nhật backend `crud_department` và `crud_team` tự động cập nhật phòng ban/thành viên liên quan khi thay đổi lãnh đạo.

### 2.4 Khắc Phục Hiển Thị Task Kanban & Detail Drawer
- **Khắc phục:**
  1. Sửa lỗi hiển thị "Chưa gán" trên Task Card bằng cách ưu tiên tra cứu danh sách nhân sự hệ thống qua ID số nguyên trước khi fallback về object `assignee`.
  2. Thêm cơ chế fallback danh sách nhân sự dự án trong `TaskDrawer.tsx`, đảm bảo ô chọn người thực hiện không bao giờ bị rỗng hoặc hiển thị bị cắt ngắn (`Dự án chưa...`).
  3. Thiết lập eager loading (`lazy="joined"`) trên SQLAlchemy models `TaskAssignment`, `Sprint`, và `DiscussionTopic`.

---

## 📷 3. Danh Sách Ảnh Bằng Chứng Tự Động (13/13 Screenshots)

Tất cả các ảnh chụp bằng chứng đã được tạo tự động bởi Playwright và lưu tại thư mục:  
`docs/testing/screenshots/automated/`

1. **`01-login-page.png`** — Giao diện Đăng nhập hệ thống TaskSync Enterprise.
2. **`02-dashboard-after-login.png`** — Bảng điều khiển Quản trị (Dashboard) sau khi đăng nhập Admin thành công.
3. **`03-department-list-card.png`** — Danh sách Phòng ban dạng thẻ Card (hiển thị đúng số lượng nhân sự, team, dự án).
4. **`04-department-detail-management.png`** — Trang Chi tiết Phòng ban (Hiển thị Trưởng phòng, nút Đổi Trưởng phòng, danh sách Team và Nhân sự).
5. **`05-team-list-card.png`** — Danh sách Nhóm (Team) trực thuộc.
6. **`06-team-detail-management.png`** — Trang Chi tiết Nhóm (Hiển thị Team Leader, nút Đổi Trưởng nhóm, danh sách Thành viên).
7. **`07-project-list.png`** — Danh sách Dự án đang triển khai.
8. **`08-project-detail.png`** — Chi tiết Dự án (tiến độ, ngân sách, thành viên).
9. **`09-task-list-table.png`** — Danh sách Công việc dạng Bảng (Table View) đầy đủ thông tin Người thực hiện, Sprint, Epic, Phòng ban.
10. **`10-task-kanban-board.png`** — Giao diện Kanban Board hiển thị rõ ràng tên người thực hiện (không còn lỗi "Chưa gán").
11. **`11-task-detail-drawer-assigned.png`** — Task Detail Drawer hiển thị thông tin công việc và người được phân công.
12. **`12-task-detail-attachments.png`** — Danh sách Tài liệu đính kèm công việc.
13. **`13-task-detail-checklist.png`** — Danh sách Kiểm tra (Checklist) tiến độ công việc.

---

## 📝 4. Trạng Thái Git & Đăng Ký Kiểm Duyệt

- **Branch hiện tại:** `develop`
- **Thư mục làm việc:** `E:\TaskSyncEnterprise`
- **Trạng thái Push:** 🛑 **ĐÃ DỪNG LẠI THEO ĐÚNG QUY TRÌNH. CHƯA EXECUTE GIT PUSH.**
- **Thông báo dừng:** `WAITING FOR USER SCREENSHOT REVIEW — NOT PUSHED`

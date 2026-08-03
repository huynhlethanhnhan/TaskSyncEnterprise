# Ma Trận Phân Quyền (RBAC Permission Matrix)

Tài liệu này xác định chi tiết quyền hạn của 4 vai trò chính trong hệ thống **TaskSyncEnterprise**.

---

## 1. Định Nghĩa Các Vai Trò (Roles)

| Role Code | Tên Vai Trò | Mã ID | Phạm Vi Quyền (Scope Boundary) |
| :--- | :--- | :--- | :--- |
| `ROLE_ADMIN` | System Admin | 1 | **Toàn hệ thống**: Quyền tối cao trên mọi phòng ban, dự án, tài khoản và cấu hình hệ thống. |
| `ROLE_MANAGER` | Department Manager | 2 | **Trong Phòng Ban (Department Scope)**: Quản lý các Team, Employee và Project thuộc phòng ban quản lý. |
| `ROLE_TEAM_LEADER` | Team Leader | 4 | **Trong Nhóm (Team Scope)**: Quản lý công việc, phân công task, quản lý Product Backlog thuộc Team được phân công. **Không có quyền Manager toàn hệ thống và không được đổi Team Leader.** |
| `ROLE_EMPLOYEE` | Employee / Member | 3 | **Trong Phạm Vi Được Giao (Self / Project Scope)**: Xem công việc, cập nhật tiến độ task cá nhân, xem dự án được tham gia. |

---

## 2. Ma Trận Quyền Chi Tiết (Permission Matrix)

| Chức Năng / Thao Tác (Action) | Admin | Manager | Team Leader | Employee | Ghi Chú An Ninh (Security Notes) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Tạo / Xóa / Đổi Trưởng Phòng (Department Manager)** | ✅ | ❌ | ❌ | ❌ | Chỉ Admin được bổ nhiệm / điều chuyển Trưởng phòng |
| **Tạo / Xóa / Đổi Trưởng Nhóm (Team Leader)** | ✅ | ❌ | ❌ | ❌ | **Chỉ Admin mới có quyền gán / thay đổi `Team.leader_id`** |
| **Thêm / Chuyển Thành Viên Phòng Ban** | ✅ | ✅ (Dept scope) | ❌ | ❌ | Manager chỉ thao tác trong Department của mình |
| **Thêm / Chuyển Thành Viên Team** | ✅ | ✅ (Dept scope) | ✅ (Team scope) | ❌ | Leader chỉ thao tác với Employee thuộc Team |
| **Tạo / Chỉnh Sửa Dự Án (Project)** | ✅ | ✅ (Dept scope) | ✅ (Dept/Team member) | ❌ | Yêu cầu `require_project_management` |
| **Quản Lý Product Backlog (Tạo/Sửa/Xóa)** | ✅ | ✅ (Project scope) | ✅ (Project scope) | ❌ | Employee chỉ xem Backlog, không sửa/tạo |
| **Tạo Task Mới** | ✅ | ✅ | ✅ | ✅ (Nếu là thành viên dự án) | IDOR Check: Phải là thành viên dự án |
| **Phân Công Task (Assignee)** | ✅ | ✅ | ✅ | ✅ | Assignee phải thuộc danh sách thành viên dự án (HTTP 409 nếu không thuộc) |
| **Xem Chi Tiết Công Việc / File / Comment** | ✅ | ✅ | ✅ | ✅ (Project member) | IDOR Check: Trả lời HTTP 403/404 nếu không có quyền truy cập |

---

## 3. Quy Tắc Phạm Vi Ủy Quyền Của Team Leader (Team Leader Delegated Scope Rules)

1. **Ranh Giới Team (Team Isolation)**:
   - Team Leader chỉ có quyền ủy quyền quản lý các thành viên có `team_id` trùng với Team mà mình làm Leader.
   - Team Leader **không có quyền** quản lý thành viên thuộc Team khác hoặc Phòng ban khác.
2. **Khóa Quyền Đổi Leader (Leader Immutability Protection)**:
   - Nếu một Employee đang là Team Leader active của một Team, Manager hoặc Team Leader khác **không thể** tự ý xóa hoặc điều chuyển nhân sự đó sang Team/Phòng ban khác.
   - Thao tác này trả về `HTTP 409 Conflict` với thông báo: *"Only an Admin can move an active Team Leader."*
3. **Nguồn Sự Thật Backend (Backend Source of Truth)**:
   - Phân quyền RBAC được kiểm soát nghiêm ngặt tại các Service/Dependency guard của FastAPI (`require_project_access`, `require_project_management`, `_ensure_team_manager`).
   - Trình duyệt Frontend chỉ điều khiển ẩn/hiện nút bấm để tối ưu trải nghiệm (UX).

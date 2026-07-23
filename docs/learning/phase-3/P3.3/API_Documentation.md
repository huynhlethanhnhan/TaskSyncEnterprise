# ⚙️ Danh Sách API Mới Phase 3.3 — TaskSync Enterprise

Tài liệu này tổng hợp danh sách các API mới được phát triển và đưa vào hoạt động trong Phase 3.3.

---

## 📊 1. Nhóm API Dashboard Analytics
Cung cấp dữ liệu thống kê tổng hợp thời gian thực cho màn hình quản trị.

### API 1: Lấy Dữ Liệu Tổng Quan Dashboard (Overview)
*   **Endpoint**: `GET /api/v1/dashboard/overview`
*   **Mô tả**: Trả về số lượng tổng số và số lượng hoạt động của Nhân viên, Phòng ban, Dự án, Công việc quá hạn và Yêu cầu nghỉ phép.
*   **Phân quyền**: Yêu cầu quyền Employee (Nhân viên) hoạt động trở lên.
*   **Phản hồi mẫu**:
    ```json
    {
      "success": true,
      "message": "Dashboard overview counters retrieved successfully.",
      "data": {
        "total_employees": 10,
        "active_employees": 8,
        "inactive_employees": 2,
        "total_departments": 4,
        "total_projects": 5,
        "active_projects": 3,
        "total_tasks": 25,
        "completed_tasks": 15,
        "pending_tasks": 10,
        "overdue_tasks": 2,
        "vacation_requests": 6,
        "pending_vacation_requests": 1
      },
      "meta": {
        "timestamp": "2026-07-10T16:03:45.653Z",
        "request_id": "aac1a9fa-4934-4d5f-94fc-87074936d160",
        "execution_time": 0.0415
      }
    }
    ```

### API 2: Lấy Dữ Liệu Phân Tích Biểu Đồ (Analytics Breakdown)
*   **Endpoint**: `GET /api/v1/dashboard/analytics`
*   **Mô tả**: Trả về dữ liệu phân bổ phân loại chi tiết (ví dụ: công việc theo trạng thái, dự án theo trạng thái, nhân viên phân bố theo phòng ban) để vẽ biểu đồ ở frontend.
*   **Phân quyền**: Yêu cầu quyền Employee hoạt động.

---

## 🔔 2. Nhóm API Thông Báo (Notification Center)
Quản lý trạng thái đọc và danh sách thông báo của từng nhân viên.

### API 3: Lấy Danh Sách Thông Báo Phân Trang
*   **Endpoint**: `GET /api/v1/notifications`
*   **Tham số truy vấn (Query Params)**:
    *   `page`: Số trang (Mặc định: 1)
    *   `size`: Số lượng bản ghi mỗi trang (Mặc định: 50)
    *   `keyword`: Tìm kiếm theo từ khóa trong tiêu đề/nội dung thông báo
    *   `sort_by`: Cột sắp xếp (`created_at`, `title`, `id`) (Mặc định: `created_at`)
    *   `sort_order`: Chiều sắp xếp (`desc`, `asc`) (Mặc định: `desc`)
*   **Mô tả**: Trả về danh sách thông báo được lọc, tìm kiếm và phân trang của nhân viên đang đăng nhập.
*   **Phản hồi mẫu**:
    ```json
    {
      "success": true,
      "message": "Notifications retrieved successfully.",
      "data": [
        {
          "id": 12,
          "employee_id": 4,
          "title": "Bạn được giao công việc mới",
          "message": "Nhiệm vụ 'Thiết kế Database' đã được giao cho bạn.",
          "is_read": false,
          "created_at": "2026-07-10T23:28:25.070Z"
        }
      ],
      "meta": {
        "page": 1,
        "size": 50,
        "total": 1,
        "pages": 1,
        "timestamp": "2026-07-10T23:28:25.138Z",
        "request_id": "ef9c9652-0227-4fe6-8ebe-d7ccee5e794c",
        "execution_time": 0.03
      }
    }
    ```

### API 4: Lấy Số Lượng Thông Báo Chưa Đọc
*   **Endpoint**: `GET /api/v1/notifications/unread-count`
*   **Mô tả**: Trả về tổng số thông báo chưa đọc của nhân viên hiện tại.
*   **Phản hồi mẫu**:
    ```json
    {
      "success": true,
      "message": "Unread notification count retrieved successfully.",
      "data": {
        "unread_count": 3
      },
      "meta": {
        "timestamp": "2026-07-10T23:28:25.145Z",
        "request_id": "bf8c8652-0227-4fe6-8ebe-d7ccee5e794f",
        "execution_time": 0.005
      }
    }
    ```

### API 5: Đánh Dấu Một Thông Báo Là Đã Đọc
*   **Endpoint**: `PATCH /api/v1/notifications/{notification_id}/read`
*   **Mô tả**: Đổi trạng thái `is_read = true` của thông báo tương ứng. Hệ thống sẽ xác thực quyền sở hữu để tránh nhân viên này đọc thông báo của nhân viên khác.

### API 6: Đánh Dấu Tất Cả Thông Báo Là Đã Đọc
*   **Endpoint**: `PATCH /api/v1/notifications/read-all`
*   **Mô tả**: Đổi trạng thái tất cả các thông báo chưa đọc của nhân viên hiện tại thành đã đọc.

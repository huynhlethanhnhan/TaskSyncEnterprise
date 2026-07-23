# 💻 Hướng Dẫn Lập Trình Viên Phase 3.3 — TaskSync Enterprise

Tài liệu này hướng dẫn chi tiết cách tổ chức mã nguồn, viết mã nghiệp vụ, sử dụng các thư viện hạ tầng và tích hợp các module dùng chung trong Phase 3.3.

---

## 1. Cấu Trúc Thư Mục Hệ Thống
Hạ tầng backend của TaskSync Enterprise được chia tách rõ ràng theo cấu trúc phân tầng như sau:

```text
backend/
├── app/
│   ├── core/                  # Cấu hình hệ thống, dependency dùng chung, hằng số
│   ├── database/              # Khởi tạo SQLAlchemy engine, quản lý session, giám sát truy vấn chậm
│   ├── handlers/              # Central exception handler bắt lỗi API và định dạng JSON phản hồi lỗi
│   ├── middleware/            # Middleware ghi nhận vòng đời HTTP request và mã liên kết request_id
│   ├── models/                # Các thực thể SQLAlchemy ORM
│   ├── routers/               # Các route FastAPI (Lớp trình diễn giao tiếp Client)
│   │   └── v1/                # API Version 1 (dashboard, notifications, tasks...)
│   ├── schemas/               # Lớp xác thực dữ liệu vào/ra (Pydantic V2 Models)
│   ├── services/              # Lớp xử lý logic nghiệp vụ chính (DashboardService, NotificationService...)
│   └── utils/                 # Các module hỗ trợ dùng chung (QueryEngine, SearchEngine...)
├── logs/                      # Thư mục chứa log xoay vòng (app.log, error.log)
└── tests/                     # Suite kiểm thử tích hợp và E2E
```

---

## 2. Trách Nhiệm Của Các Thành Phần

### Presentation Layer (Routers)
*   **Trách nhiệm**: Định nghĩa các endpoint HTTP, khai báo schema đầu vào/đầu ra, cấu hình dependency injection để phân quyền RBAC và trích xuất database session (`db`).
*   **Quy tắc**: Không viết trực tiếp các câu lệnh truy vấn SQL phức tạp hoặc logic tính toán nghiệp vụ tại đây. Chỉ gọi phương thức dịch vụ tương ứng tại lớp `Service` và trả về kết quả qua `ResponseBuilder`.

### Business Logic Layer (Services)
*   **Trách nhiệm**: Quản lý nghiệp vụ chính, tính toán dữ liệu, thực hiện kiểm tra quyền nghiệp vụ đặc thù và phối hợp các thao tác ghi dữ liệu.
*   **Quy tắc**: Đảm bảo lớp dịch vụ hoàn toàn độc lập với các giao thức HTTP (không phụ thuộc trực tiếp vào các đối tượng FastAPI như `Request` hay `Response`).

### Infrastructure Helpers (QueryEngine, SearchEngine)
*   **Trách nhiệm**: Cung cấp các hàm tĩnh (static methods) để tự động hóa việc lọc, tìm kiếm tương đồng và phân trang trên các câu lệnh truy vấn SQLAlchemy.

---

## 3. Hướng Dẫn Sử Dụng Background Job Framework

`BackgroundJobService` giúp bạn chạy các tác vụ tiêu tốn thời gian một cách bất đồng bộ để tránh chặn phản hồi HTTP trả về cho Client.

### Bước 1: Khai báo hàm tác vụ nền
Hàm tác vụ nền phải là hàm Python thông thường. Nếu hàm cần tương tác với cơ sở dữ liệu, hãy tự khởi tạo và đóng session bằng `SessionLocal` để đảm bảo an toàn luồng dữ liệu (thread-safety):

```python
def send_email_async_task(recipient: str, subject: str, body: str) -> None:
    # 1. Khởi tạo session cơ sở dữ liệu độc lập
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Thực hiện logic nghiệp vụ ghi nhận hoặc gửi mail
        pass
    finally:
        db.close() # Đảm bảo luôn đóng session để giải phóng connection pool
```

### Bước 2: Gọi bất đồng bộ từ Router
Sử dụng dependency injection `get_background_job_service` để lấy instance dịch vụ:

```python
from fastapi import APIRouter, Depends
from app.services.background_job_service import BackgroundJobService, get_background_job_service

router = APIRouter()

@router.post("/trigger-job")
def trigger_job(
    recipient: str,
    bg_service: BackgroundJobService = Depends(get_background_job_service)
):
    # Enqueue tác vụ, hàm này sẽ trả về ngay lập tức
    bg_service.enqueue(send_email_async_task, recipient=recipient, subject="Hello", body="World")
    return {"message": "Tác vụ đang được xử lý ngầm."}
```

---

## 4. Quy Trình Tạo Và Quản Lý Thông Báo (Notification Workflow)

Module thông báo trong ứng dụng hoạt động thông qua `NotificationService`. Mọi nghiệp vụ tạo thông báo nên chạy bất đồng bộ để tối ưu hiệu năng.

### Tạo thông báo bất đồng bộ từ Service
Khi một sự kiện xảy ra (ví dụ: giao việc thành công), hãy gọi phương thức `create_notification_async` để đẩy việc lưu thông báo vào hàng đợi chạy ngầm:

```python
from app.services.notification_service import notification_service
from app.schemas.notification import CreateNotificationRequest

def assign_task_service(db: Session, task_id: int, employee_id: int, bg_service: BackgroundJobService):
    # 1. Thực hiện logic giao việc
    # ...
    
    # 2. Tạo yêu cầu thông báo
    notif_data = CreateNotificationRequest(
        employee_id=employee_id,
        title="Bạn có công việc mới",
        message=f"Bạn đã được giao nhiệm vụ ID {task_id}."
    )
    
    # 3. Đăng ký chạy ngầm thông qua BackgroundJobService
    notification_service.create_notification_async(bg_service, notif_data)
```

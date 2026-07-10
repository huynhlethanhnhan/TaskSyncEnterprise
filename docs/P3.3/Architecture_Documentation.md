# 📖 Tài Liệu Kiến Trúc Phase 3.3 — TaskSync Enterprise

Tài liệu này mô tả chi tiết kiến trúc hoạt động, vòng đời xử lý và luồng dữ liệu của các thành phần hạ tầng cốt lõi được xây dựng trong Phase 3.3.

---

## 1. Request Lifecycle (Vòng Đời HTTP Request)
Kiến trúc xử lý vòng đời của một HTTP Request từ lúc bắt đầu cho tới khi phản hồi được gửi lại cho Client:

```mermaid
sequenceDiagram
    autonumber
    Client ->> Middleware: Gửi HTTP Request (e.g. GET /api/v1/employees)
    Note over Middleware: RequestContextMiddleware
    Middleware ->> Middleware: Tạo & Gán Correlation ID (X-Request-ID)
    Middleware ->> Logger: Thiết lập Correlation ID vào ContextVar
    
    Middleware ->> Router: Chuyển tiếp Request tới API Router
    Router ->> Service: Gọi Service nghiệp vụ
    Service ->> DB: Truy vấn dữ liệu (SQL Server)
    DB -->> Service: Trả về kết quả
    Service -->> Router: Trả về Entity/Model
    
    Router ->> ResponseBuilder: ApiResponse.envelop(data)
    Note over ResponseBuilder: Response Framework
    ResponseBuilder ->> ResponseBuilder: Đóng gói JSON với 'success', 'data', 'meta'
    ResponseBuilder -->> Client: Trả về HTTP Response + X-Request-ID Header
```

---

## 2. Exception Flow (Luồng Xử Lý Ngoại Lệ)
Cơ chế bắt lỗi tập trung giúp che dấu các lỗi kỹ thuật thô của database và trả về thông báo lỗi thân thiện cho client:

```mermaid
graph TD
    A[Phát sinh Ngoại lệ trong Service/DB] --> B{Kiểu Ngoại Lệ?}
    B -- Business/API Exception --> C[AppException / ResourceNotFound]
    B -- Validation Error --> D[Pydantic ValidationError]
    B -- Database Error --> E[SQLAlchemy / DBAPI Error]
    
    C --> F[unified_exception_handler]
    D --> F
    E --> G[Ghi log chi tiết lỗi kèm traceback ẩn]
    G --> H[Chuyển đổi thành InternalServerError mã 500]
    H --> F
    
    F --> I[ResponseBuilder.error]
    I --> J[Trả về JSON: success=False, error_code, message]
    J --> K[Gửi HTTP Response 4xx/5xx về Client]
```

---

## 3. Logging Flow (Hệ Thống Ghi Log Đóng Gói)
Luồng xử lý ghi nhật ký hệ thống sử dụng ContextVar để liên kết mọi dòng log trong một request:

```mermaid
graph TD
    A[Hành động ghi log: app_logger.info] --> B[Truy xuất request_id từ ContextVar]
    B --> C[Custom LogFormatter]
    C --> D{Môi Trường?}
    D -- Development --> E[Hiện Console định dạng màu]
    D -- Production --> F[Ghi log JSON cấu trúc vào file app.log / error.log]
    F --> G[Xoay vòng file log tự động RotatingFileHandler]
```

---

## 4. Query & Search Pipeline (Đường Ống Lọc & Tìm Kiếm)
Quy trình xây dựng câu lệnh truy vấn động, sắp xếp và phân trang thông qua bộ máy `QueryEngine`:

```mermaid
graph LR
    A[Bắt đầu: Base Query] --> B[Lọc theo cột: filter_params]
    B --> C[Tìm kiếm từ khóa: SearchEngine.apply_search]
    C --> D[Sắp xếp: SortParams]
    D --> E[Phân trang: PaginationParams]
    E --> F[Thực thi truy vấn DB]
    F --> G[Trả về: Items & Total Count]
```

---

## 5. Dashboard Analytics Query Flow
Luồng tối ưu hóa dữ liệu Dashboard tổng quan chỉ bằng một lần gọi cơ sở dữ liệu:

```mermaid
graph TD
    subgraph DashboardService.get_overview
        S1[Subquery: Đếm Nhân viên]
        S2[Subquery: Đếm Dự án]
        S3[Subquery: Đếm Task Quá Hạn]
        S4[Subquery: Đếm Nghỉ Phép]
        Combine[Gộp chung các Subquery vào một SELECT duy nhất]
    end

    Combine --> DB[(SQL Database)]
    DB --> Output[Một dòng kết quả chứa đầy đủ các cột đếm]
```

---

## 6. Background Jobs Execution Lifecycle
Vòng đời chạy tác vụ nền không chặn để gửi email, ghi log kiểm toán hoặc xử lý file:

```mermaid
sequenceDiagram
    autonumber
    Caller ->> JobService: enqueue(send_email_task, email_data)
    Note over JobService: BackgroundJobService
    JobService ->> JobService: Bao bọc task bằng _wrap_task (Log & Error check)
    
    alt Có FastAPI BackgroundTasks
        JobService ->> FastAPI: Đăng ký task
        FastAPI -->> Caller: Trả về HTTP response trước
        FastAPI ->> Worker: Chạy task bất đồng bộ sau khi gửi response
    else Gọi từ ngoài HTTP / Cấu hình Fallback
        JobService ->> ThreadPool: Gửi task vào ThreadPoolExecutor (5 workers)
        ThreadPool -->> Caller: Tiếp tục luồng xử lý chính ngay lập tức
        ThreadPool ->> Worker: Chạy task trên thread riêng biệt
    end
    
    Worker ->> Worker: Thực thi logic tác vụ
    alt Thành công
        Worker ->> Logger: Ghi nhận hoàn thành (thời gian chạy ms)
    else Thất bại
        Worker ->> Logger: Ghi lỗi + Stack Trace đầy đủ
    end
```

---

## 7. Notification Center Flow
Cơ chế phân phối và quản lý thông báo nghiệp vụ tích hợp hạ tầng chạy nền bất đồng bộ:

```mermaid
sequenceDiagram
    autonumber
    Business Event ->> NotifSvc: create_notification_async(employee_id, title, message)
    NotifSvc ->> JobService: enqueue(create_notification_async_task, data)
    Note over JobService: Chuyển giao tác vụ nền bất đồng bộ
    JobService -->> Business Event: Trả về điều khiển ngay lập tức
    
    rect rgb(240, 240, 240)
        Note over JobService, DB: Tiến trình nền chạy ngầm
        JobService ->> DB: Tạo SessionLocal mới
        JobService ->> DB: INSERT INTO notifications
        JobService ->> DB: Commit & Close Session
    end
    
    Client ->> Router: GET /notifications?page=1&size=10
    Router ->> DB: Lấy danh sách thông báo phân trang của User
    DB -->> Client: Trả về JSON ApiResponse[Paged[Notification]]
```

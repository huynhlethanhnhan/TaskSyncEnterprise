# 📋 Tổng Quan Phase 3.3 — TaskSync Enterprise

Tài liệu này tóm tắt mục tiêu, kiến trúc tiến hóa và các quyết định thiết kế quan trọng được thực hiện trong **Phase 3.3** của dự án TaskSync Enterprise.

---

## 🎯 Mục Tiêu Phase 3.3
Phase 3.3 tập trung vào việc xây dựng hạ tầng kỹ thuật bền vững (infrastructure-first) và cung cấp các thành phần cốt lõi có khả năng tái sử dụng cao bao gồm:
1.  **Enterprise Response Framework**: Chuẩn hóa cấu trúc phản hồi API (định dạng JSON phong bì đồng nhất cho cả dữ liệu đơn lẻ, phân trang và lỗi).
2.  **Enterprise Global Exception Framework**: Xử lý ngoại lệ tập trung toàn hệ thống, ngăn chặn rò rỉ vết lỗi cơ sở dữ liệu thô (raw database trace leaks) và chuyển đổi thành mã lỗi doanh nghiệp tiêu chuẩn.
3.  **Enterprise Logging Middleware**: Ghi chép vòng đời đầy đủ của HTTP request với mã định danh liên kết duy nhất (`request_id` / Correlation ID).
4.  **Enterprise Query Engine & Search Engine**: Bộ công cụ xây dựng truy vấn động, lọc nâng cao, sắp xếp và tìm kiếm từ khóa không phân biệt chữ hoa/thường trên nhiều cột.
5.  **Enterprise Dashboard Analytics**: Cung cấp API tổng hợp dữ liệu thời gian thực được tối ưu hóa chỉ trong một lượt truy vấn DB bằng cách sử dụng các scalar subqueries.
6.  **Enterprise Background Job Framework**: Cơ chế chạy các tác vụ nền không chặn (non-blocking) hỗ trợ chuyển dịch linh hoạt sang hệ thống phân tán (như Celery/Redis) trong tương lai.
7.  **Enterprise Notification Center**: Module lưu trữ thông báo trong ứng dụng được phát sinh bởi các sự kiện nghiệp vụ, tích hợp đầy đủ cơ chế lọc phân trang và chạy bất đồng bộ.

---

## 🏗️ Sự Tiến Hóa Của Kiến Trúc (Architecture Evolution)

Trong các phase trước, hệ thống triển khai các route và thao tác CRUD đơn giản nhưng thiếu một bộ quy chuẩn chung về phản hồi dữ liệu và xử lý bất đồng bộ. 

Ở Phase 3.3, kiến trúc đã tiến hóa thành một **mô hình hướng dịch vụ tích hợp sâu hạ tầng**:
*   **Decoupled Async Layers (Tách Biệt Lớp Bất Đồng Bộ)**: Việc tích hợp `BackgroundJobService` cho phép định tuyến các tiến trình tốn thời gian (như gửi thông báo, kiểm tra hết hạn mã token) ra ngoài luồng phản hồi HTTP chính.
*   **Pipeline-driven Querying (Truy Vấn Theo Đường Ống)**: Thay thế việc viết các câu lệnh lọc/phân trang thủ công tại mỗi endpoint bằng quy trình đường ống (`QueryEngine.apply_pipeline`), giảm tải code lặp lại lên tới 90%.
*   **Database-dialect Awareness (Tự Nhận Biết Phương Ngôn DB)**: Khả năng tự động thay đổi cú pháp truy vấn tùy vào môi trường DB (dùng `sysutcdatetime()` cho MS SQL Server ở production và Python `datetime.utc` cho SQLite ở môi trường kiểm thử).

---

## 💡 Các Quyết Định Thiết Kế Quan Trọng (Key Design Decisions)

### 1. Tận Dụng FastAPI BackgroundTasks & ThreadPoolFallback
*   *Quyết định*: Thay vì cài đặt Redis & Celery ngay lập tức làm tăng độ phức tạp khi deploy, chúng tôi sử dụng `FastAPI.BackgroundTasks` làm hàng đợi nội bộ và cung cấp cơ chế dự phòng `ThreadPoolExecutor` khi gọi từ các lớp dịch vụ nằm ngoài HTTP request.
*   *Lý do*: Đảm bảo tính gọn nhẹ, dễ kiểm thử cục bộ và sẵn sàng thay thế cấu hình bên trong `BackgroundJobService.enqueue` sang Celery mà không làm ảnh hưởng đến code nghiệp vụ.

### 2. Thiết Kế Hộp Phản Hồi Đồng Nhất (Uniform Response Enveloping)
*   *Quyết định*: Mọi API đều trả về dạng JSON chuẩn có `success`, `message`, `data`, và `meta` (chứa `timestamp`, `request_id`, `execution_time`).
*   *Lý do*: Đơn giản hóa quá trình xử lý dữ liệu tại Frontend và cho phép tự động kiểm tra hiệu năng API thông qua trường dữ liệu `execution_time`.

---

## 📂 Danh Mục Tài Liệu Phase 3.3

Để tìm hiểu chi tiết các thành phần trong Phase 3.3, vui lòng tham khảo các tài liệu chuyên đề dưới đây:

*   📖 [Tài Liệu Kiến Trúc (Architecture Documentation)](file:///e:/TaskSyncEnterprise/docs/P3.3/Architecture_Documentation.md): Chi tiết sơ đồ luồng dữ liệu, vòng đời request và các đường ống xử lý.
*   💻 [Hướng Dẫn Lập Trình Viên (Developer Guide)](file:///e:/TaskSyncEnterprise/docs/P3.3/Developer_Guide.md): Cấu trúc thư mục, quy trình gọi dịch vụ, cách đăng ký background job và tạo thông báo.
*   ⚙️ [Tài Liệu API & Mẫu Dữ Liệu (API Documentation)](file:///e:/TaskSyncEnterprise/docs/P3.3/API_Documentation.md): Catalog các API mới giới thiệu trong Phase 3.3 và định dạng JSON phản hồi mẫu.
*   🏎️ [Hiệu Năng & Bảo Mật (Performance & Security Notes)](file:///e:/TaskSyncEnterprise/docs/P3.3/Performance_Security.md): Tối ưu hóa câu lệnh SQL, cơ chế chống SQL Injection, kiểm soát log và dấu che lỗi.
*   🎓 [Báo Cáo Học Tập & Mẫu Thiết Kế (Learning & Patterns Report)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.3/README.md): Phân tích chi tiết các nguyên lý SOLID, mẫu thiết kế áp dụng.
*   🗺️ [Lộ Trình Tương Lai (Future Enterprise Roadmap)](file:///e:/TaskSyncEnterprise/docs/roadmap/Phase_3.3_Roadmap.md): Kế hoạch nâng cấp hạ tầng phân tán trong Phase tiếp theo.

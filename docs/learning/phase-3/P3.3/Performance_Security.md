# 🏎️ Hiệu Năng & Bảo Mật Phase 3.3 — TaskSync Enterprise

Tài liệu này tổng hợp các phương thức tối ưu hóa hiệu năng và các chốt phòng ngự bảo mật được triển khai trong Phase 3.3.

---

## 🏎️ Tối Ưu Hóa Hiệu Năng (Performance Optimization)

### 1. Tối Ưu Hóa Câu Lệnh Lọc & Phân Trang (Query Optimization & Pagination)
*   **Tránh Nạp Thực Thể Dư Thừa**: Phân trang luôn giới hạn số bản ghi nạp lên bộ nhớ RAM thông qua cú pháp `.offset(page * size).limit(size)`.
*   **Phân Trang Ở Lớp DB**: Số lượng tổng số bản ghi (`total count`) được truy vấn riêng bằng lệnh đếm tối giản, tránh việc nạp toàn bộ danh sách bản ghi ra rồi dùng hàm `len()` trong Python.

### 2. Gộp Các Truy Vấn Tổng Hợp (Subquery-backed Aggregations)
*   **Single Round-Trip**: Endpoint `/dashboard/overview` lấy dữ liệu tổng hợp từ 5 bảng độc lập (Nhân viên, Dự án, Phòng ban, Nhiệm vụ, Nghỉ phép).
*   **Giải Pháp**: Toàn bộ các câu lệnh đếm (`COUNT`) được bao bọc dưới dạng scalar subquery và gom vào duy nhất một câu lệnh SELECT tổng thể. Điều này giảm thiểu độ trễ kết nối mạng từ FastAPI đến máy chủ SQL Server xuống chỉ còn 1 lượt gọi duy nhất thay vì 12 lượt gọi lặp lại (N+1 Query Issue).

### 3. Kiểm Soát Overhead Của Ghi Nhật Ký (Logging Performance)
*   **Buffered Writing & Rotation**: Log tệp sử dụng cơ chế xoay vòng tệp `RotatingFileHandler` tự động cắt file khi đạt dung lượng tối đa 10MB, tránh phình to kích thước file gây treo I/O của ổ đĩa.

---

## 🔒 Các Giải Pháp Bảo Mật (Security Framework)

### 1. Che Giấu Chi Tiết Lỗi Kỹ Thuật (Exception Masking)
*   **Ngăn Chặn Schema Leaks**: Khi cơ sở dữ liệu gặp lỗi (lỗi cú pháp, mất kết nối, xung đột khóa ngoại), SQLAlchemy sẽ ném ra lỗi thô chứa toàn bộ cấu trúc bảng và câu lệnh SQL SQL Server.
*   **Giải Pháp**: Hệ thống Exception Handler tập trung sẽ intercept các lỗi này, ghi vết chi tiết vào tệp `error.log` nội bộ kèm theo `request_id`, đồng thời trả về phản hồi HTTP 500 tối giản cho Client:
    ```json
    {
      "success": false,
      "error_code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred. Please contact support with Request ID: <request_id>"
    }
    ```
    Điều này ngăn chặn triệt để kẻ tấn công thu thập thông tin về cấu trúc cơ sở dữ liệu để thực hiện các cuộc tấn công khai thác sâu hơn.

### 2. Mã Liên Kết Request (Correlation IDs)
*   **Traceability**: Mọi HTTP request khi đi qua Middleware đều được đính kèm một ID duy nhất (`X-Request-ID`). ID này tự động chèn vào mọi dòng log được ghi nhận trong suốt quá trình xử lý request đó. Khi client gặp lỗi, họ chỉ cần gửi mã Request ID cho bộ phận hỗ trợ kỹ thuật để tra cứu chính xác vết lỗi trong file log mà không cần phải đoán.

### 3. Phòng Chống Tấn Công Tiêm Mã SQL (SQL Injection Prevention)
*   **Tham Số Hóa Toàn Bộ (Parameterized Queries)**: `QueryEngine` và `SearchEngine` tuyệt đối không sử dụng phương pháp nối chuỗi để tạo câu lệnh SQL (`f"SELECT ... WHERE title = '{keyword}'"`). Toàn bộ bộ lọc động đều được dịch sang cấu trúc cây AST của SQLAlchemy và thực thi dưới dạng câu lệnh tham số hóa (Parameterized queries) được biên dịch an toàn bởi trình điều khiển cơ sở dữ liệu.

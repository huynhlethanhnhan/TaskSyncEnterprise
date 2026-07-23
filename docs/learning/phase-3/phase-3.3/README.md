# 🎓 Báo Cáo Học Tập Phase 3.3 — TaskSync Enterprise

Báo cáo này tổng hợp các kiến thức doanh nghiệp, nguyên lý thiết kế và mẫu lập trình phần mềm được áp dụng trong Phase 3.3.

---

## 💡 Các Nguyên Lý SOLID Được Áp Dụng

### 1. Single Responsibility Principle (SRP - Nguyên Lý Đơn Nhiệm)
*   **Áp dụng**: Tách biệt hoàn toàn `BackgroundJobService` và `NotificationService`. 
    *   `BackgroundJobService` chỉ chịu trách nhiệm duy nhất là quản lý hàng đợi và thực thi các callback bất đồng bộ độc lập với nghiệp vụ.
    *   `NotificationService` chỉ chịu trách nhiệm lưu trữ, truy vấn và đổi trạng thái đọc của thông báo. Dịch vụ này không tự quản lý luồng chạy ngầm mà giao việc đó cho bộ máy chạy ngầm thực thi.

### 2. Dependency Inversion Principle (DIP - Nguyên Lý Đảo Ngược Phụ Thuộc)
*   **Áp dụng**: Các API endpoint và Service nghiệp vụ không phụ thuộc trực tiếp vào phương thức chạy bất đồng bộ cụ thể (chạy luồng cục bộ, chạy tiến trình độc lập). 
    *   Tất cả giao tiếp thông qua giao diện của `BackgroundJobService`. Nhờ đó, việc thay thế hạ tầng cơ sở từ ThreadPool cục bộ sang hàng đợi Celery/Redis ở các phase sau không yêu cầu sửa đổi bất kỳ dòng code nghiệp vụ nào tại các router hoặc controller.

---

## 🎨 Mẫu Thiết Kế Lập Trình (Design Patterns)

### 1. Facade Pattern (Mẫu Giao Diện Đơn Giản)
*   **Áp dụng**: `QueryEngine` và `SearchEngine` đóng vai trò là một lớp Facade bao bọc các thao tác phức tạp của SQLAlchemy (tạo mệnh đề WHERE động, JOIN bảng, áp dụng regex tìm kiếm, phân trang và tính toán tổng số dòng). Lập trình viên chỉ cần gọi một hàm tĩnh duy nhất và truyền vào tham số dạng cấu trúc thay vì viết hàng chục dòng code lặp lại.

### 2. Wrapper / Decorator Pattern
*   **Áp dụng**: Hàm tĩnh `_wrap_task` trong `BackgroundJobService` đóng gói hàm thực thi gốc của lập trình viên. 
    *   Nó chèn thêm các tính năng bổ sung như: tự động ghi nhận thời gian bắt đầu/kết thúc, ghi nhận lỗi kèm traceback, đính kèm Correlation ID. Hàm chạy gốc hoàn toàn không bị thay đổi logic nội bộ nhưng nhận thêm đầy đủ khả năng giám sát và bảo vệ lỗi.

---

## 🧠 Các Khái Niệm Doanh Nghiệp (Enterprise Concepts)

### 1. Database-dialect Portability (Độc Lập Động Phương Ngôn DB)
*   Trong dự án thực tế, môi trường thử nghiệm (Testing) thường sử dụng cơ sở dữ liệu gọn nhẹ trong bộ nhớ (SQLite), trong khi môi trường sản phẩm (Production) chạy trên các cơ sở dữ liệu lớn (MS SQL Server). Việc sử dụng các hàm thời gian đặc thù như `SYSUTCDATETIME()` trên SQL Server gây lỗi crash trên SQLite. 
*   **Bài học**: Chúng tôi học được cách viết mã có khả năng tự phát hiện phương ngôn kết nối (`db.bind.dialect.name`) để quyết định sử dụng giá trị tham số hóa linh hoạt, đảm bảo ứng dụng có thể chạy mượt mà trên bất kỳ cơ sở dữ liệu nào mà không cần thay đổi code lõi.

### 2. Business Intelligence (BI) Query Optimization
*   Khi xây dựng các dashboard phân tích dữ liệu lớn, việc chạy lặp lại hàng chục câu lệnh SELECT đếm dữ liệu sẽ làm nghẽn hàng đợi kết nối của DB.
*   **Bài học**: Áp dụng kỹ thuật truy vấn scalar subqueries giúp gộp tất cả thống kê vào một dòng phản hồi duy nhất, tối thiểu hóa độ trễ kết nối mạng và tối đa hóa hiệu năng đọc của ổ đĩa máy chủ dữ liệu.

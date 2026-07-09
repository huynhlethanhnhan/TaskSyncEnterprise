# Phase 2: Ràng Buộc Cơ Sở Dữ Liệu & Thiết Kế Dữ Liệu Nền Tảng

Chào mừng bạn đến với Phase 2 của Chương trình Học Backend TaskSync Enterprise V2. Trong giai đoạn này, chúng ta sẽ đi sâu vào nền tảng của mọi ứng dụng doanh nghiệp: **Tính toàn vẹn của Cơ sở Dữ liệu & Nền tảng Dữ liệu**.

Nếu không có một cơ sở dữ liệu ổn định, dễ dự đoán và được ánh xạ ràng buộc chính xác, code ở lớp logic nghiệp vụ (Business Logic Layer) sẽ trở nên cực kỳ phức tạp, dễ xảy ra lỗi và không thể mở rộng. Tài liệu này sẽ đóng vai trò là kim chỉ nam chính thức để bạn làm chủ kiến trúc cơ sở dữ liệu, quản lý migration, ánh xạ quan hệ thực thể (ORM) với SQLAlchemy 2.0 và cơ chế mã hóa mật khẩu bảo mật cao.

---

## 🎯 Mục tiêu Học Tập
1. Nhận diện và loại bỏ các schema lỗi thời và model trùng lặp bằng mẫu thiết kế **Single Source of Truth (SSOT)**.
2. Refactor các model SQLAlchemy cũ sang phong cách **SQLAlchemy 2.0 type annotated mapping style** (`Mapped` và `mapped_column`).
3. Đảm bảo tính **Referential Integrity** (toàn vẹn tham chiếu) bằng cách sử dụng các ràng buộc khóa ngoại, giá trị mặc định hệ thống và chỉ mục (index) trực tiếp trên MS SQL Server.
4. Quản lý database migrations trên SQL Server bằng Alembic, bao gồm việc viết các đoạn script tùy biến để **tự động phát hiện và drop các default constraints**.
5. Ghi nhận thời gian không phụ thuộc vào múi giờ (timezone-independent) bằng cách sử dụng timestamp UTC độ chính xác cao (`SYSUTCDATETIME()`).
6. Xử lý lưu trữ văn bản Unicode an toàn bằng tiền tố chuỗi của SQL Server (`N'value'`).
7. Viết và cấu hình các Pytest fixtures để chạy unit test độc lập với hệ quản trị cơ sở dữ liệu (sử dụng cơ chế viết lại metadata để chạy SQLite in-memory thay thế cho SQL Server).
8. Sử dụng thư viện `bcrypt` trực tiếp để mã hóa mật khẩu, bỏ qua các thư viện wrapper trung gian nhằm tối ưu hóa hiệu năng.

---

## 📂 Danh Mục Tài Liệu Học Tập

*   **[01. Database Design & Default Constraints](file:///e:/TaskSyncEnterprise/docs/learning/phase-2/01_database_design.md):** Thiết kế khóa chính, ràng buộc giá trị mặc định hệ thống, và đồng bộ hóa múi giờ UTC.
*   **[02. Relationships & Cascading Rules](file:///e:/TaskSyncEnterprise/docs/learning/phase-2/02_relationships.md):** Cách thiết lập mối quan hệ giữa các bảng (1-N, N-N) và cơ chế xóa lan truyền để tránh rác dữ liệu.
*   **[03. SQLAlchemy & Database Migrations](file:///e:/TaskSyncEnterprise/docs/learning/phase-2/03_sqlalchemy_migrations.md):** Quản lý phiên bản cơ sở dữ liệu bằng Alembic và xử lý khóa ràng buộc mặc định trên MS SQL Server.
*   **[04. API Security Testing & Encryption](file:///e:/TaskSyncEnterprise/docs/learning/phase-2/04_api_security_testing.md):** Viết unit test tự động kiểm thử bảo mật API, mã hóa mật khẩu với `bcrypt`.

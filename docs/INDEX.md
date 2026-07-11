# Mục Lục Tài Liệu Hướng Dẫn (Master Documentation Index)

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án `TaskSyncEnterprise`. Dưới đây là mục lục liên kết đến các hướng dẫn vận hành chi tiết.

---

## 📖 1. Tài Liệu Hướng Dẫn Vận Hành (Operational Guides)

* **[Hướng Dẫn Quản Trị API (docs/api/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/api/GUIDE.md)**:
  * Phân chia phiên bản API URL `/api/v1/`.
  * Cơ chế chống trùng lắp dữ liệu giao dịch bằng `Idempotency-Key` kết hợp Redis lock.
  * Quản lý vòng đời khấu hao API thông qua các `@deprecate_endpoint` decorator.
* **[Hướng Dẫn Kiến Trúc Hệ Thống (docs/architecture/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/architecture/GUIDE.md)**:
  * Cấu trúc phân lớp thư mục Clean Architecture.
  * Định dạng thời gian và chuỗi ký tự unicode an toàn cho MS SQL Server.
  * Cơ chế Xóa Mềm (Soft Delete) và Tự động ghi vết hoạt động (Audit log listener).
  * Quy trình đính kèm Request correlation ID context (`X-Request-ID`).
* **[Hướng Dẫn Triển Khai & Đóng Gói (docs/deployment/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/GUIDE.md)**:
  * Đóng gói Dockerfile đa tầng tối ưu dung lượng và bảo mật.
  * Cấu hình docker-compose mạng nội bộ và vùng đĩa volumes.
  * Chốt chặn kiểm tra sức khỏe của container (SRE health check probes).
  * Danh sách kiểm tra triển khai sản xuất (Production Checklist).
* **[Hướng Dẫn Hạ Tầng Thông Báo (docs/notification/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/notification/GUIDE.md)**:
  * Cách ly các kênh thông báo (EMAIL, IN_APP, WEBSOCKET, PUSH) qua Strategy Pattern.
  * Thiết lập WebSocket gateway phục vụ đẩy tin real-time.
  * Hàng đợi chạy ngầm quét gửi lại email lỗi (Retry Poller thread daemon).

---

## 🗺️ 2. Lộ Trình & Báo Cáo Kỹ Thuật (Roadmap & Reports Index)

* **[Lộ Trình Phát Triển (roadmap/README.md)](file:///e:/TaskSyncEnterprise/roadmap/README.md)**: Gantt chart tiến trình các Milestone nghiệp vụ và kế hoạch Phase 3.7 - Phase 4.
* **[Mục Lục Báo Cáo Đánh Giá (reports/README.md)](file:///e:/TaskSyncEnterprise/reports/README.md)**: Tập hợp các báo cáo đánh giá an ninh bảo mật, kiểm thử hiệu năng, chất lượng mã nguồn và mức độ sẵn sàng vận hành thực tế.

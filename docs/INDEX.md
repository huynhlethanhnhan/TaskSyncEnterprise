# Mục Lục Tài Liệu Hướng Dẫn (Master Documentation Index)

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án `TaskSyncEnterprise`. Dưới đây là mục lục liên kết đến các hướng dẫn vận hành và học tập chi tiết trong repository.

---

## 📖 1. Tài Liệu Hướng Dẫn Vận Hành & Khắc Phục Sự Cố (Operational & Troubleshooting Guides)

*   **[Hướng Dẫn Quản Trị API (docs/api/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/api/GUIDE.md)**:
    *   Phân chia phiên bản API URL `/api/v1/`.
    *   Cơ chế chống trùng lắp dữ liệu giao dịch bằng `Idempotency-Key` kết hợp Redis lock.
    *   Quản lý vòng đời khấu hao API thông qua các `@deprecate_endpoint` decorator.
*   **[Hướng Dẫn Kiến Trúc Hệ Thống (docs/architecture/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/architecture/GUIDE.md)**:
    *   Cấu trúc phân lớp thư mục Clean Architecture (Router -> Service -> Repository/CRUD).
    *   Định dạng thời gian và chuỗi ký tự unicode an toàn cho MS SQL Server.
    *   Cơ chế Xóa Mềm (Soft Delete) và Tự động ghi vết hoạt động (Audit log listener).
    *   Quy trình đính kèm Request correlation ID context (`X-Request-ID`).
*   **[Hướng Dẫn Triển Khai & Đóng Gói (docs/deployment/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/GUIDE.md)**:
    *   Đóng gói Dockerfile đa tầng tối ưu dung lượng và bảo mật (Production Hardening).
    *   Cấu hình docker-compose mạng nội bộ và vùng đĩa volumes.
    *   Chốt chặn kiểm tra sức khỏe của container (SRE health check probes).
    *   Danh sách kiểm tra triển khai sản xuất (Production Checklist).
*   **[Hướng Dẫn Vận Hành Sao Lưu & Phục Hồi (docs/operations/BACKUP_OPERATIONS_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/operations/BACKUP_OPERATIONS_GUIDE.md)**:
    *   Hướng dẫn chạy script sao lưu tự động Full & Differential.
    *   Cấu trúc bundle backup, manifest JSON và SHA-256 checksums.
*   **[Hướng Dẫn Phục Hồi Dữ Liệu An Toàn (docs/operations/RESTORE_OPERATIONS_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/operations/RESTORE_OPERATIONS_GUIDE.md)**:
    *   Hướng dẫn phục hồi cơ sở dữ liệu isolated test DB mặc định và production dual controls.
    *   Dynamic `RESTORE FILELISTONLY` MOVE mapping, upload staging/rollback và Redis restore.


*   **[Hướng Dẫn Vận Hành CI (docs/deployment/CI_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/CI_GUIDE.md)**:
    *   Quy trình kiểm thử và kiểm tra chất lượng tự động qua GitHub Actions.
    *   Hướng dẫn chạy Ruff, Black check và Pytest cục bộ.
    *   Xử lý lỗi CI thường gặp và cấu hình bảo vệ nhánh (Branch Protection).
*   **[Hướng Dẫn Vận Hành Quét Bảo Mật (docs/deployment/SECURITY_SCAN_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/deployment/SECURITY_SCAN_GUIDE.md)**:
    *   Hướng dẫn chạy quét bảo mật Bandit (SAST) và pip-audit (SCA) cục bộ.
    *   Hướng dẫn cấu hình, xử lý false positive và cập nhật các vulnerabilities trong dependencies.
*   **[Hướng Dẫn Hạ Tầng Thông Báo (docs/notification/GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/notification/GUIDE.md)**:
    *   Cách ly các kênh thông báo (EMAIL, IN_APP, WEBSOCKET, PUSH) qua Strategy Pattern.
    *   Thiết lập WebSocket gateway phục vụ đẩy tin real-time.
    *   Hàng đợi chạy ngầm quét gửi lại email lỗi (Retry Poller thread daemon).
*   **[Hướng Dẫn Hệ Thống Quan Sát, Đo Lường & Giám Sát (docs/monitoring/prometheus_setup.md)](file:///e:/TaskSyncEnterprise/docs/monitoring/prometheus_setup.md)**:
    *   Thiết lập và vận hành Prometheus Server thu thập metrics tự động.
    *   **[Hướng Dẫn Tích Hợp Grafana (docs/learning/phase-3.7.6-grafana-monitoring-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.7.6-grafana-monitoring-guide-vi.md)**: Hướng dẫn kỹ thuật và lý thuyết trực quan hóa chỉ số giám sát bằng tiếng Việt.
    *   **[Kịch Bản Kiểm Thử Giám Sát (docs/monitoring/phase-3.7.6-manual-testing-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/monitoring/phase-3.7.6-manual-testing-guide-vi.md)**: Quy trình kiểm thử thủ công và checklist xác minh hoạt động của Grafana + Prometheus.
*   **[Hướng Dẫn Xử Lý Sự Cố Frontend (docs/frontend/FRONTEND_TROUBLESHOOTING.md)](file:///e:/TaskSyncEnterprise/docs/frontend/FRONTEND_TROUBLESHOOTING.md)**:
    *   Cẩm nang xử lý lỗi giao diện React khởi động thành công nhưng trống dữ liệu.
    *   Sơ đồ cây quyết định chẩn đoán (Decision Tree) và các lỗi kết nối, CORS, token JWT, DB Seed.
*   **[Kịch Bản Kiểm Thử Thủ Công Hệ Thống (docs/testing/MANUAL_SYSTEM_TEST.md)](file:///e:/TaskSyncEnterprise/docs/testing/MANUAL_SYSTEM_TEST.md)**:
    *   Checklist chi tiết từng module (Auth, Employee, Task, Notification, Vacation, Audit, Upload, Health, Monitoring, CI).
    *   Mô tả bước thực hiện, kết quả mong đợi và đánh giá Pass/Fail.
*   **[Hướng Dẫn Khởi Tạo Dữ Liệu Mẫu (docs/database/SEED_GUIDE.md)](file:///e:/TaskSyncEnterprise/docs/database/SEED_GUIDE.md)**:
    *   Hướng dẫn chạy script seed dữ liệu mẫu `backend/seed_v2.py` trên Docker và Local.
    *   Thứ tự xóa/chèn dữ liệu tránh vi phạm Foreign Key và đề xuất nâng cấp seed strategy.

---

## 🎓 2. Tài Liệu Đào Tạo Lập Trình Viên (Learning & Training Guides)

*   **[Sổ Tay Kỹ Thuật Backend Doanh Nghiệp (docs/learning/phase-3.8-backend-enterprise-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.8-backend-enterprise-guide-vi.md)**:
    *   Tài liệu đào tạo toàn diện bằng tiếng Việt giải thích lý do, hoàn cảnh và cách thức doanh nghiệp áp dụng các công nghệ hiện đại.
    *   Phân tích chi tiết về CI/CD GitHub Actions, Bandit/pip-audit Security Scan, Docker Production Hardening, Prometheus/Grafana/OpenTelemetry Observability, Git Flow, và Clean Architecture backend.
*   **[Đào Tạo Tích Hợp Grafana (docs/learning/phase-3.7.6-grafana-monitoring-guide-vi.md)](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.7.6-grafana-monitoring-guide-vi.md)**:
    *   Hướng dẫn chi tiết về cách thiết lập Grafana datasource, xây dựng dashboards và quản lý các metric thu thập từ OpenTelemetry.

---

## 🗺️ 3. Lộ Trình & Báo Cáo Kỹ Thuật (Roadmap & Reports Index)

*   **[Lộ Trình Phát Triển (roadmap/README.md)](file:///e:/TaskSyncEnterprise/roadmap/README.md)**: Gantt chart tiến trình các Milestone nghiệp vụ và kế hoạch Phase 3.7 - Phase 4.
*   **[Mục Lục Báo Cáo Đánh Giá (reports/README.md)](file:///e:/TaskSyncEnterprise/reports/README.md)**: Tập hợp các báo cáo đánh giá an ninh bảo mật, kiểm thử hiệu năng, chất lượng mã nguồn và mức độ sẵn sàng vận hành thực tế.
    *   **[Báo Cáo Đánh Giá Kiến Trúc Backup & Disaster Recovery (docs/reports/PHASE_3_8_7_BACKUP_DR_ARCHITECTURE_AUDIT.md)](file:///e:/TaskSyncEnterprise/docs/reports/PHASE_3_8_7_BACKUP_DR_ARCHITECTURE_AUDIT.md)**: Audit tổng thể và thiết kế kiến trúc sao lưu, phục hồi dữ liệu và phòng chống thảm họa.
    *   **[Báo Cáo Chứng Nhận Phòng Chống Thảm Họa DR (docs/reports/PHASE_3_8_7_FINAL_DR_CERTIFICATION.md)](file:///e:/TaskSyncEnterprise/docs/reports/PHASE_3_8_7_FINAL_DR_CERTIFICATION.md)**: Báo cáo nghiệm thu và chứng nhận sẵn sàng triển khai hệ thống Backup/DR (Phase 3.8.7 - Hoàn thành).

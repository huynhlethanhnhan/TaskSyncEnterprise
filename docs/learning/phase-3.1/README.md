# Phase 3.1: Hạ Tầng Doanh Nghiệp & Tối Ưu Hóa Vận Hành

Chào mừng bạn đến với Phase 3.1 của Chương trình Học Backend TaskSync Enterprise V2. 

Trong giai đoạn này, trọng tâm của chúng ta dịch chuyển từ thiết kế tính năng sản phẩm thông thường sang **Hạ tầng Doanh nghiệp & Tối ưu hóa Vận hành**. Một ứng dụng hoạt động ổn định trong thực tế đòi hỏi cấu hình an toàn, ghi log dễ truy vết, hệ thống chẩn đoán sức khỏe thông minh và phòng thủ các kịch bản tấn công web phổ biến.

---

## 🎯 Mục tiêu Học Tập
1. Hiểu sâu sắc sự khác biệt giữa ASGI và WSGI và cách FastAPI xử lý bất đồng bộ.
2. Xây dựng cấu hình tập trung, bất biến (Frozen settings) an toàn qua Pydantic Settings V2.
3. Thiết lập hệ thống ghi log quay vòng hạn chế dung lượng, truyền dẫn mã liên vết Correlation ID thông qua ngữ cảnh biến ContextVars.
4. Triển khai các API kiểm tra sức khỏe hệ thống (Liveness, Readiness Probes) chuẩn Kubernetes.
5. Phòng chống tấn công Host Header Injection và Clickjacking bằng việc cấu hình Trusted Hosts và chèn OWASP response headers.

---

## 📂 Danh Mục Tài Liệu Học Tập

*   **[01. Backend Foundation](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.1/01_Backend_Foundation.md):** Khái niệm kiến trúc ASGI, định tuyến FastAPI APIRouter.
*   **[02. Configuration Management](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.1/02_Configuration_Management.md):** Quản lý cấu hình tập trung biến môi trường sử dụng Pydantic.
*   **[03. Enterprise Logging](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.1/03_Enterprise_Logging.md):** Ghi nhật ký quay vòng an toàn, định vị sự cố nhanh bằng Correlation ID.
*   **[04. Health Checks](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.1/04_Health_Checks.md):** Thiết kế Liveness và Readiness Probes phục vụ các hạ tầng điều phối container tự động.
*   **[05. Production Hardening](file:///e:/TaskSyncEnterprise/docs/learning/phase-3.1/05_Production_Hardening.md):** Phòng vệ HTTP Host Header, OWASP Security Headers và dọn dẹp tài nguyên khi tắt máy.

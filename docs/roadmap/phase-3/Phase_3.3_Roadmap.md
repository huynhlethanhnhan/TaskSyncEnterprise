# 🗺️ Lộ Trình Phát Triển Tương Lai — TaskSync Enterprise

Tài liệu này vạch ra lộ trình nâng cấp hạ tầng nghiệp vụ sau khi hoàn thành Phase 3.3.

---

## 🚀 1. Phân Phối Thông Báo Đa Kênh (Multichannel Notification Delivery)
Hiện tại, Notification Center mới chỉ lưu trữ và trả về thông báo trong ứng dụng (In-app notifications). Các bước tiếp theo bao gồm:
*   **Gửi Email Tự Động**: Tích hợp các nhà cung cấp SMTP hoặc dịch vụ email đám mây (e.g. AWS SES, SendGrid) thông qua hàng đợi tác vụ bất đồng bộ.
*   **Tích Hợp SMS & Push Notification**: Gửi tin nhắn qua Twilio hoặc thông báo đẩy qua Firebase Cloud Messaging (FCM) cho các ứng dụng di động trong tương lai.
*   **Tích Hợp Chat Ops**: Gửi thông báo trực tiếp vào các kênh làm việc của doanh nghiệp trên Microsoft Teams, Slack, Telegram.

---

## 📦 2. Hạ Tầng Tác Vụ Phân Tán (Redis & Celery Migration)
Khi số lượng người dùng đồng thời tăng lên, việc sử dụng thread pool nội bộ trong ứng dụng sẽ dẫn đến quá tải bộ nhớ và mất mát tác vụ nếu server khởi động lại:
*   **Tách Biệt Server Xử Lý Nền**: Cấu hình **Celery** chạy như một service độc lập bên ngoài API server chính.
*   **Hàng Đợi Bộ Nhớ Redis**: Sử dụng Redis hoặc RabbitMQ làm Message Broker phân phối tác vụ nền, cho phép kiểm soát số lượng tác vụ xử lý đồng thời (rate limiting) và thực hiện lại khi thất bại (retry policies).

---

## ⚡ 3. Caching & Tối Ưu Hóa Truy Vấn (Caching Strategy)
*   **Bộ Đệm Dữ Liệu Tĩnh**: Sử dụng Redis để cache các danh mục ít biến động (như danh sách Phòng ban, Vai trò phân quyền, Danh sách Dự án đang lập kế hoạch) nhằm giải phóng tài nguyên cho hệ thống cơ sở dữ liệu SQL Server.
*   **Cache Dashboard Metrics**: Cache kết quả tổng đếm trang Dashboard Overview trong thời gian ngắn (ví dụ: 1 phút) thay vì liên tục truy vấn SQL tính toán thời gian thực khi nhân viên refresh trang.

---

## 🧪 4. Mở Rộng Kiểm Thử & CI/CD (Testing & Deployment)
*   **Kiểm Thử Hiệu Năng (Load Testing)**: Viết kịch bản kiểm thử tải bằng Locust để đo lường độ chịu tải của API Dashboard và middleware ghi log khi có 10,000+ request/giây.
*   **Tự Động Hóa CI/CD Pipeline**: Tích hợp các bước tự động kiểm tra code (`flake8`, `black`, `pyright`) và tự động chạy unit test suite khi phát sinh commit mới trên GitHub Actions.
*   **Giám Sát Hạ Tầng (Observability)**: Tích hợp các công cụ thu thập số liệu (e.g. Prometheus, Grafana) để vẽ biểu đồ giám sát tài nguyên CPU, RAM, dung lượng kết nối DB Pool và cảnh báo sớm lỗi hệ thống.

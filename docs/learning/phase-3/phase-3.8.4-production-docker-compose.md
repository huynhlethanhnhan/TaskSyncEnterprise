# Tài Liệu Đào Tạo: Production Docker Compose Foundation

Tài liệu này cung cấp hướng dẫn lý thuyết và thực hành về cách xây dựng, vận hành và bảo mật hệ thống bằng Docker Compose trong môi trường Production (Sản xuất) áp dụng cho dự án `TaskSyncEnterprise`.

---

## 1. Production Docker Compose Là Gì?

**Production Docker Compose** là cấu hình điều phối các container (orchestration configuration) được thiết kế riêng để đáp ứng các tiêu chuẩn bảo mật, hiệu năng và độ tin cậy của môi trường sản xuất doanh nghiệp. 

Khác với môi trường phát triển (Development) tập trung vào sự linh hoạt và khả năng debug, môi trường Production tập trung vào:
- **Tính bất biến (Immutability):** Không mount source code động để chỉnh sửa trực tiếp.
- **Cách ly mạng (Network Isolation):** Hạn chế tối đa các kết nối không cần thiết.
- **An toàn đặc quyền (Least Privilege):** Không chạy quyền root, loại bỏ quyền hạt nhân không cần thiết.
- **Độ tin cậy (Reliability):** Ràng buộc tài nguyên (CPU/RAM) và cấu hình giám sát tự động.

---

## 2. Khác Biệt Giữa Development Và Production Compose

| Tiêu chí | Môi trường Phát triển (Dev) | Môi trường Sản xuất (Production) | Lý do thay đổi |
| :--- | :--- | :--- | :--- |
| **Source Code Mount** | Bind-mount trực tiếp thư mục code (HMR, auto-reload). | Đóng gói cứng vào Docker Image (bất biến). | Ngăn chặn chỉnh sửa code trái phép trực tiếp trên server production. |
| **Port Exposure** | Expose toàn bộ các port ra host (8000, 6379, 1433). | Chỉ expose cổng gateway/frontend. Các dịch vụ trong chỉ giao tiếp nội bộ. | Giảm thiểu diện tích tấn công (Attack Surface). |
| **Quyền chạy container** | Chạy bằng user `root` (mặc định của Docker). | Chạy bằng user không đặc quyền (`tasksync` và `nginx`). | Ngăn chặn leo thang đặc quyền từ container lên host OS (Container Breakout). |
| **Tài nguyên (Resources)** | Sử dụng không giới hạn tài nguyên của máy host. | Áp đặt giới hạn CPU, RAM cứng (limits & reservations). | Tránh tình trạng một container bị rò rỉ bộ nhớ hoặc bị tấn công DoS làm sập toàn bộ OS host. |
| **Bảo mật File System** | Có quyền đọc/ghi trên toàn bộ thư mục container. | Hệ điều hành file chỉ đọc (`read_only`), chỉ ghi vào các folder được chỉ định. | Ngăn chặn hacker tải lên và thực thi mã độc hoặc ghi đè cấu hình hệ thống. |

---

## 3. Các Nguyên Tắc Thiết Kế Trọng Yếu

### A. Network Isolation (Cô lập mạng)
Chúng ta áp dụng nguyên tắc **Least Privilege** cho mạng Docker bằng cách phân tách làm 3 mạng riêng biệt:
1.  `frontend-network` (Bridge): Kết nối Frontend SPA (Nginx) với API Gateway/Backend. Người dùng bên ngoài chỉ tiếp cận được mạng này qua cổng frontend.
2.  `backend-network` (Bridge, `internal: true`): Mạng nội bộ kết nối Backend với SQL Server và Redis. Mạng này **không có quyền truy cập internet** và bên ngoài không thể kết nối tới nó.
3.  `monitoring-network` (Bridge): Kết nối Backend với Prometheus, Grafana và cAdvisor để thu thập chỉ số mà không để lộ các endpoint giám sát này ra mạng công cộng.

### B. Named Volumes & Persistent Storage (Lưu trữ lâu bền)
Tất cả dữ liệu trạng thái phải được gắn vào các Named Volume do Docker quản lý:
- Dữ liệu cơ sở dữ liệu: `mssql_data_prod`
- Cấu hình & Dữ liệu Redis: `redis_data_prod`
- Tệp tin do người dùng tải lên (Avatars, Attachments): `backend_uploads`
- Nhật ký hệ thống (Logs): `backend_logs`

> [!CAUTION]
> **Cảnh báo quan trọng:** 
> Tuyệt đối không sử dụng lệnh `docker compose down -v` trên môi trường Production. Tham số `-v` sẽ xóa sạch các Named Volume này và dẫn đến mất dữ liệu vĩnh viễn. Để dừng container an toàn, chỉ chạy `docker compose down`.

### C. Health Checks & Dependency Management
Hệ thống tự động kiểm tra trạng thái hoạt động của các dịch vụ để tự phục hồi:
- **SQL Server:** Query kiểm tra qua tiện ích `sqlcmd` mỗi 15 giây.
- **Redis:** Gửi lệnh `redis-cli ping` mỗi 10 giây.
- **Backend:** Kiểm tra endpoint `/health/live` của FastAPI bằng thư viện urllib chuẩn của Python.
- **Frontend:** Truy vấn trang `/health` của Nginx qua `wget`.

Việc khởi động Backend phụ thuộc vào điều kiện các service lưu trữ đã khỏe mạnh thông qua `depends_on.condition: service_healthy`.

### D. Khai báo biến môi trường an toàn (Environment Variables)
Mọi mật khẩu hoặc mã khóa bảo mật trong production compose phải sử dụng cú pháp bắt buộc của Docker Compose:
```yaml
SECRET_KEY=${SECRET_KEY:?SECRET_KEY is required}
MSSQL_SA_PASSWORD=${MSSQL_SA_PASSWORD:?MSSQL_SA_PASSWORD is required}
```
Nếu các biến môi trường này thiếu, Docker Compose sẽ báo lỗi và từ chối chạy thay vì khởi động với các giá trị mặc định yếu kém.

---

## 4. Các Lệnh Kiểm Tra Thủ Công Trên Môi Trường

### A. Kiểm tra cấu hình kết xuất (Dry Run Render)
Xác minh cú pháp của file compose và xem các giá trị biến môi trường có được nạp chính xác không mà không khởi chạy container:
```powershell
docker compose -f docker-compose.production.yml config
```

### B. Kiểm tra quyền chạy của container (Non-root user check)
Xác minh xem container có thực sự chạy dưới quyền user bị giới hạn hay không:
```powershell
# Kiểm tra backend
docker exec -it tasksync-backend-prod id
# Kết quả mong đợi: uid=10001(tasksync) gid=10001(tasksync)

# Kiểm tra frontend
docker exec -it tasksync-frontend-prod id
# Kết quả mong đợi: uid=101(nginx) gid=101(nginx)
```

### C. Kiểm tra trạng thái sức khỏe (Health status check)
Xem chi tiết trạng thái sức khỏe và số lần kiểm tra thất bại nếu có:
```powershell
docker inspect --format='{{json .State.Health}}' tasksync-backend-prod
```

---

## 5. Các Lỗi Thường Gặp (Common Mistakes)

1.  **Dùng host gateway `host.docker.internal` trong Production:** Trong production, các container nên giao tiếp trực tiếp qua tên dịch vụ trên Docker Network thay vì đi vòng qua host gateway.
2.  **Lộ cổng Database và Redis ra Internet:** Để lộ cổng `1433` và `6379` ra ngoài host tạo cơ hội cho các cuộc tấn công brute-force. Cần xóa cấu hình `ports` đối với các dịch vụ này trên Production.
3.  **Quên mount volume cho tệp tin upload:** Nếu không mount thư mục `/app/uploads` ra ngoài, khi cập nhật container backend, toàn bộ ảnh avatar và file đính kèm của khách hàng sẽ biến mất.
4.  **Sử dụng mật khẩu mặc định:** Sử dụng các mật khẩu dạng `admin` hoặc `123456` cho Grafana hoặc SQL Server trên Production sẽ làm sập tính an toàn của toàn hệ thống.
5.  **Chạy uvicorn ở chế độ `--reload`:** Chế độ reload làm tăng mức sử dụng tài nguyên và có nguy cơ rò rỉ thông tin gỡ lỗi.
6.  **Sử dụng sai cú pháp thoát biến Dollar ($$ vs $):** Việc dùng double dollar `$$` trong environment của compose (ví dụ: `DATABASE_URL=...sa:$$MSSQL_SA_PASSWORD...`) khiến container nhận giá trị thô dạng chuỗi ký tự `${MSSQL_SA_PASSWORD}` thay vì giá trị thực tế của mật khẩu, vì Python không tự phân giải biến shell trong connection string. Hãy dùng single dollar `${VAR}` để Compose tự động nội suy trước khi đưa vào container.
7.  **Sử dụng `localhost` trong health check trên hệ điều hành Alpine:** Alpine Nginx mặc định phân giải `localhost` thành địa chỉ IPv6 `::1`, trong khi Nginx chỉ listen trên cổng IPv4 (`0.0.0.0`). Điều này gây lỗi `Connection refused`. Giải pháp là thay đổi đích đến thành `127.0.0.1`.

---

## 6. Khả Tích Hợp Mật Khẩu (SA Credential & Volume Compatibility)

Trong quá trình quản trị SQL Server trên Docker, cần nắm rõ quy tắc vận hành mật khẩu SA gắn liền với Volume lưu trữ:
- **Nguyên lý Khởi Tạo:** Tham số `MSSQL_SA_PASSWORD` trong Docker Compose chỉ có tác dụng thiết lập mật khẩu lần đầu tiên khi container SQL Server khởi chạy và tạo dựng thư mục dữ liệu trên named volume (`tasksyncenterprise_mssql_data_prod`).
- **Hiện Tượng Mismatch:** Khi bạn thay đổi giá trị mật khẩu trong file cấu hình `.env.production`, SQL Server khi khởi chạy lại sẽ sử dụng thư mục dữ liệu đã có sẵn trong volume và **không tự động thay đổi mật khẩu SA nội bộ** theo cấu hình mới. Điều này dẫn đến việc Backend (sử dụng mật khẩu mới từ `.env`) không thể kết nối tới DB (vẫn sử dụng mật khẩu cũ ghi trong volume), gây lỗi sập kết nối (Authentication failed).
- **Cách Giải Quyết Đúng:** 
  1. Nếu muốn đổi mật khẩu SA, bạn cần đăng nhập vào SQL Server container và chạy câu lệnh T-SQL thay đổi thông tin xác thực (`ALTER LOGIN sa WITH PASSWORD = 'new_password'`), sau đó mới cập nhật đồng bộ file `.env.production`.
  2. **Tuyệt đối không dùng lệnh `docker compose down -v`** để giải quyết lỗi không khớp mật khẩu, bởi lệnh này sẽ xoá sạch các named volume chứa toàn bộ cơ sở dữ liệu nghiệp vụ của doanh nghiệp.


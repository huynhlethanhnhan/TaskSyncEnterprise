# Tài liệu Đào tạo Nhà phát triển — Bảo mật Môi trường, Thông tin xác thực & Runtime Hardening (Phase 3.8.5)

Tài liệu này cung cấp các kiến thức cốt lõi và tiêu chuẩn thực hành an toàn thông tin dành cho các kỹ sư phát triển phần mềm trong dự án `TaskSyncEnterprise`.

---

## 1. Biến Môi Trường (Environment Variables): Cấu hình vs Bí mật (Config vs Secret)

Trong kiến trúc ứng dụng Enterprise, chúng ta cần phân biệt rõ ràng hai khái niệm:
*   **Cấu hình (Configuration):** Là các tham số điều hướng hành vi ứng dụng nhưng không nhạy cảm, có thể công khai công việc hoặc lưu trữ trong Git.
    *   *Ví dụ:* `ENVIRONMENT=production`, `LOG_LEVEL=INFO`, `PORT=8000`.
*   **Bí mật (Secret):** Là thông tin xác thực, khoá mật mã, hoặc chuỗi token truy cập mà nếu lộ lọt sẽ làm tổn hại đến tính bảo mật của hệ thống.
    *   *Ví dụ:* `SECRET_KEY`, `MSSQL_SA_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`.

> [!CAUTION]
> **Quy tắc tuyệt đối:** Không bao giờ được commit bất kỳ thông tin bí mật nào (`secret`) vào hệ thống quản lý mã nguồn Git.

---

## 2. Vì sao `VITE_*` không bao giờ được coi là Bí mật (Secret)?

Trong các ứng dụng React SPA (Single Page Application), mọi biến môi trường có tiền tố `VITE_` (ví dụ: `VITE_API_URL`) đều được công cụ bundler (Vite) biên dịch trực tiếp và thay thế dạng tĩnh vào mã nguồn Javascript gửi về trình duyệt của người dùng.
*   **Hành vi:** Bất cứ ai mở F12 hoặc kiểm tra file build static `.js` đều có thể đọc được giá trị này.
*   **Quy tắc:** Chỉ đặt các tham số công khai như cổng API hoặc địa chỉ base URL vào các biến `VITE_*`. Tuyệt đối không đưa mật khẩu, khoá JWT, hay API key của các bên thứ ba (như SendGrid, AWS) vào frontend.

---

## 3. Quản lý Tệp Cấu hình: `.env.example` vs `.env.production`

*   **`.env.example`:** Là file mẫu định dạng cấu trúc, được commit lên Git nhằm mục đích hướng dẫn nhà phát triển các biến môi trường cần có. File này chứa các giá trị giả lập an toàn hoặc để trống.
*   **`.env.production`:** Chứa cấu hình và mật khẩu thật sử dụng ở môi trường sản xuất. File này **bắt buộc** phải được liệt kê trong `.gitignore` để tránh vô tình commit lên Git.

---

## 4. Cơ chế Nội suy Biến của Docker Compose: `$` vs `$$`

Khi viết file `docker-compose.yml`, cần phân biệt cách xử lý ký tự dollar:
*   **Dấu Dollar đơn (`$` - host interpolation):** Docker Compose trên máy host sẽ đọc giá trị của biến từ tệp `.env` và thay thế trực tiếp vào trước khi tạo container.
    *   *Ví dụ:* `DATABASE_URL=mssql+pymssql://sa:${MSSQL_SA_PASSWORD}@...`
*   **Dấu Dollar kép (`$$` - container shell interpolation):** Docker Compose sẽ giữ nguyên chuỗi `$VARIABLE` và truyền trực tiếp vào biến môi trường bên trong container. Giá trị này chỉ được giải mã nếu câu lệnh chạy trong container được kích hoạt bởi một shell (như `/bin/sh` hoặc `/bin/bash`).
    *   *Lưu ý:* Ứng dụng Python/FastAPI chạy trực tiếp (như `uvicorn`) sẽ không tự phân giải shell, do đó nếu dùng `$$` nó sẽ nhận chuỗi thô `${MSSQL_SA_PASSWORD}` và kết nối lỗi.

---

## 5. Chu kỳ Thay đổi Mật khẩu (Secret Rotation) & volume DB cũ

Khi thay đổi giá trị mật khẩu SA trong tệp `.env.production`:
1.  **Hành vi Volume:** SQL Server chỉ đọc biến `MSSQL_SA_PASSWORD` để đặt mật khẩu SA lần đầu tiên khi named volume (`tasksyncenterprise_mssql_data_prod`) rỗng.
2.  **Lỗi Mismatch:** Nếu bạn thay đổi mật khẩu trong `.env.production` ở các lần chạy sau, mật khẩu lưu trong volume DB sẽ **không tự động đổi theo**. Backend (sử dụng mật khẩu mới) sẽ bị từ chối kết nối bởi SQL Server (vẫn giữ mật khẩu cũ).
3.  **Quy trình Rotation đúng:**
    *   Đăng nhập vào container database bằng công cụ `sqlcmd`.
    *   Chạy lệnh SQL đổi mật khẩu: `ALTER LOGIN sa WITH PASSWORD = 'new_password';`.
    *   Cập nhật tệp `.env.production` tương ứng và khởi động lại backend.
    *   **Cảnh báo:** Tuyệt đối không dùng `docker compose down -v` chỉ để reset mật khẩu, hành động này xoá sạch toàn bộ dữ liệu nghiệp vụ của doanh nghiệp.

---

## 6. Nguyên lý Đặc quyền Tối thiểu (Least Privilege) & Runtime Hardening

Để bảo vệ container khỏi các cuộc tấn công leo thang đặc quyền hoặc khai thác lỗ hổng thực thi mã độc, các biện pháp thắt chặt runtime sau đây được áp dụng:

### A. Non-Root Execution
Chạy ứng dụng với user không có quyền quản trị (như `tasksync` UID `10001` cho backend và `nginx` UID `101` cho frontend). Nếu kẻ tấn công chiếm được quyền kiểm soát container, họ sẽ không thể sửa đổi tệp tin hệ thống hoặc chạy các lệnh đặc quyền root.

### B. Read-Only Root Filesystem (`read_only: true`)
Thiết lập toàn bộ hệ thống file của container thành "chỉ đọc". Kẻ tấn công không thể tải xuống mã độc hoặc ghi đè các file thực thi của ứng dụng.
*   **Giải pháp ghi dữ liệu:** Các thư mục bắt buộc phải ghi (như thư mục lưu trữ file tạm `/tmp` hoặc thư mục cache của Nginx) được mount qua cơ chế **`tmpfs`** (lưu trên RAM của host và tự xoá khi container dừng) hoặc qua các **named volumes** được định vị cụ thể.

### C. Capability Dropping (`cap_drop: [ALL]`)
Mặc định Docker cấp một số quyền kernel (capabilities) cho container. Bằng cách gỡ bỏ toàn bộ quyền kernel này (`cap_drop: [ALL]`), container hoàn toàn mất khả năng thay đổi cấu hình mạng, chỉnh sửa đồng hồ hệ thống, hoặc can thiệp sâu vào kernel của máy host.

### D. No New Privileges (`no-new-privileges:true`)
Ngăn chặn các tiến trình con bên trong container tự động leo thang đặc quyền bằng cách sử dụng các cờ flag đặc biệt (như `setuid` hoặc `setgid`).

---

## 7. Cô lập Mạng (Network & Port Exposure)

*   **Không Expose cổng Database ra ngoài Host:** Các cổng nhạy cảm như `1433` (SQL Server) và `6379` (Redis) chỉ tồn tại trong mạng nội bộ Docker (`backend-network`), không được mở cổng ra ngoài host để tránh bị scan quét mật khẩu.
*   **Sử dụng DNS Service Name:** Các container liên lạc với nhau bằng tên dịch vụ (ví dụ: `http://sqlserver:1433`) thay vì dùng `localhost` hay IP tĩnh.

---

## 8. Tránh Lộ Lọt Mật khẩu trong Logs

*   **Masking Bộ lọc Tập trung:** Hệ thống sử dụng filter `SensitiveDataFilter` để tự động quét toàn bộ thông điệp log trước khi ghi ra stdout/file.
*   **Cách thức hoạt động:** Sử dụng biểu thức chính quy (Regex) quét không phân biệt chữ hoa chữ thường đối với các từ khoá nhạy cảm như `password`, `secret`, `token`, `authorization`, `cookie`, `database_url` và thay thế giá trị nhạy cảm thành `[REDACTED]` hoặc `***`.

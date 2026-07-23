# Hướng Dẫn Kiểm Thử Thủ Công Toàn Hệ Thống (Manual System Testing Guide)

Tài liệu này cung cấp các kịch bản kiểm thử thủ công và danh sách kiểm tra (checklist) để xác minh hoạt động của toàn bộ hệ thống `TaskSyncEnterprise` trước khi đưa lên môi trường Staging/Production.

---

## 📋 Danh Sách Kịch Bản Kiểm Thử & Xác Minh (Test Suite Checklist)

Mỗi kịch bản kiểm thử bao gồm các bước thực hiện, kết quả mong đợi, và hai cột để đánh dấu trạng thái kiểm thử: **Pass (Đạt)** hoặc **Fail (Lỗi)**.

### 🔐 1. Authentication (Xác thực & Phân quyền)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| AUTH-01 | Đăng nhập thành công (Admin/Manager/Employee) | 1. Truy cập trang `/login`. <br>2. Nhập email: `admin@gmail.com` và mật khẩu `123456`. <br>3. Bấm **Login**. | - Đăng nhập thành công, chuyển hướng đến trang `/dashboard`. <br>- Lưu access token và refresh token vào LocalStorage/SessionStorage. | [ ] | [ ] |
| AUTH-02 | Đăng nhập thất bại (Sai thông tin) | 1. Truy cập `/login`. <br>2. Nhập email đúng nhưng mật khẩu sai (ví dụ `1111`). <br>3. Bấm **Login**. | - Trình duyệt hiển thị thông báo lỗi `401 Unauthorized` hoặc `Email/Password không đúng`. <br>- Không chuyển hướng, không cấp token. | [ ] | [ ] |
| AUTH-03 | Đăng xuất (Logout) | 1. Đang đăng nhập, bấm vào nút **Logout** ở menu. | - Xóa sạch token ở Client storage. <br>- Gọi API `/auth/logout` để hủy phiên ở Redis blacklist. <br>- Chuyển hướng về trang đăng nhập `/login`. | [ ] | [ ] |
| AUTH-04 | Đổi mật khẩu (Change Password) | 1. Đang đăng nhập, truy cập `/change-password` hoặc Profile. <br>2. Nhập mật khẩu cũ `123456` và mật khẩu mới. | - Trả về HTTP 200, mật khẩu mới được mã hóa bcrypt và cập nhật vào SQL Server. | [ ] | [ ] |
| AUTH-05 | Phân quyền RBAC (Role-Based Access Control) | 1. Đăng nhập tài khoản Employee (`demo1@gmail.com`). <br>2. Thử truy cập trực tiếp đường dẫn quản trị Admin (ví dụ `/audit` hoặc gọi API `/api/v1/audit/logs`). | - Giao diện chặn truy cập hoặc API trả về `403 Forbidden`. | [ ] | [ ] |

---

### 👥 2. Employee & Profile (Quản lý Nhân sự)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| EMP-01 | Xem danh sách nhân viên | 1. Đăng nhập tài khoản Admin/Manager. <br>2. Điều hướng tới trang `/employees` hoặc tab Nhân viên. | - Hiển thị danh sách nhân viên đầy đủ, phân trang chính xác. | [ ] | [ ] |
| EMP-02 | Xem thông tin cá nhân | 1. Bấm vào Profile cá nhân của tài khoản đang đăng nhập. | - Hiển thị đầy đủ thông tin: Họ tên, Email, Mã nhân viên, Phòng ban, Vai trò. | [ ] | [ ] |

---

### 🏢 3. Department & Team (Quản lý Phòng ban & Đội nhóm)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| DEP-01 | Xem danh sách phòng ban | 1. Truy cập danh mục Phòng ban. | - Hiển thị phòng ban `Information Technology (IT)` và các phòng ban liên quan khác. | [ ] | [ ] |

---

### 📂 4. Project (Quản lý Dự án)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| PRJ-01 | Xem danh sách dự án | 1. Đăng nhập, truy cập trang Dự án. | - Hiển thị danh sách các dự án (ví dụ: `IT Project V2`). | [ ] | [ ] |
| PRJ-02 | Chi tiết dự án & Thành viên | 1. Bấm xem chi tiết dự án `IT Project V2`. | - Hiển thị thông tin mô tả, trạng thái, và danh sách thành viên thuộc dự án. | [ ] | [ ] |

---

### 📝 5. Task (Quản lý Công việc & Kanban)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| TSK-01 | Hiển thị bảng Kanban công việc | 1. Truy cập màn hình Kanban của dự án. | - Hiển thị 3 cột trạng thái chuẩn: `To Do`, `In Progress`, `Done`. <br>- Các task mẫu xuất hiện ở các cột tương ứng chính xác. | [ ] | [ ] |
| TSK-02 | Kéo thả di chuyển trạng thái công việc | 1. Kéo thả một công việc từ cột `To Do` sang `In Progress`. | - Trạng thái cập nhật tức thời trên UI. <br>- Gửi request PATCH cập nhật status lên API thành công. | [ ] | [ ] |
| TSK-03 | Tương tác Checklist | 1. Bấm xem chi tiết công việc. <br>2. Đánh dấu tick chọn hoàn thành một item trong Checklist. | - Tiến độ % của checklist cập nhật trên UI và lưu thành công. | [ ] | [ ] |
| TSK-04 | Viết bình luận (Comment) | 1. Bấm xem chi tiết công việc. <br>2. Nhập nội dung comment và bấm **Gửi**. | - Comment hiển thị ngay lập tức trong luồng thảo luận của task. | [ ] | [ ] |

---

### 🔔 6. Notification (Hạ tầng Thông báo)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| NTF-01 | Nhận thông báo thời gian thực (WebSocket) | 1. Đăng nhập Employee ở Trình duyệt A. <br>2. Đăng nhập Manager ở Trình duyệt B. <br>3. Ở Trình duyệt B, gán một task cho Employee trình duyệt A. | - Trình duyệt A ngay lập tức nhận được thông báo pop-up / chuông báo đỏ mà không cần F5 reload trang. | [ ] | [ ] |
| NTF-02 | Email Retry Poller | 1. Hệ thống gửi thông báo email nhưng SMTP Server lỗi (mất kết nối). <br>2. Bật lại SMTP Server. | - Hàng đợi chạy ngầm (Poller daemon thread) tự động quét các email bị lỗi và thực hiện gửi lại thành công. | [ ] | [ ] |

---

### 🏖️ 7. Vacation (Đơn xin nghỉ phép)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| VAC-01 | Tạo đơn xin nghỉ phép | 1. Đăng nhập tài khoản Employee. <br>2. Tạo đơn xin nghỉ phép từ ngày A đến ngày B, nhập lý do. | - Đơn được tạo với trạng thái ban đầu là `Pending`. | [ ] | [ ] |
| VAC-02 | Duyệt đơn xin nghỉ phép | 1. Đăng nhập tài khoản Manager. <br>2. Xem danh sách đơn nghỉ phép chờ duyệt. <br>3. Bấm **Approve** hoặc **Reject**. | - Trạng thái đơn cập nhật thành `Approved` hoặc `Rejected`. <br>- Employee nhận được thông báo cập nhật kết quả duyệt phép. | [ ] | [ ] |

---

### 📜 8. Audit Log (Ghi vết Hoạt động)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| AUD-01 | Tự động ghi vết hoạt động | 1. Thực hiện một hành động (ví dụ cập nhật thông tin nhân viên hoặc chuyển trạng thái task). <br>2. Đăng nhập tài khoản Admin, truy cập trang `/audit` hoặc kiểm tra bảng `audit_logs` trong DB. | - Có bản ghi log chi tiết: Người thực hiện, loại hành động, thời gian xảy ra hành động. | [ ] | [ ] |

---

### 📁 9. File Attachment & Upload (Đính kèm tệp)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| UPL-01 | Upload tệp đính kèm hợp lệ | 1. Trong phần đính kèm của Task, tải lên file `.pdf` hoặc `.png` dung lượng nhỏ (ví dụ 1MB). | - Upload thành công, tệp tin được lưu trong thư mục `uploads/` của backend và hiển thị liên kết tải về. | [ ] | [ ] |
| UPL-02 | Upload tệp đính kèm không hợp lệ | 1. Cố tình upload file có đuôi `.exe` hoặc dung lượng vượt ngưỡng cấu hình (ví dụ >10MB). | - Hệ thống từ chối upload, trả về thông báo lỗi định dạng hoặc dung lượng không hợp lệ. | [ ] | [ ] |

---

### 🏥 10. Health Endpoints & Probes (Kiểm tra Sức khỏe Hệ thống)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| HLT-01 | Lightweight Health Check | 1. Gửi request GET tới [http://localhost:8000/health](http://localhost:8000/health). | - HTTP 200 OK. Trả về `{"status": "ok"}` nhanh chóng. | [ ] | [ ] |
| HLT-02 | Database & Redis Readiness | 1. Gửi request GET tới [http://localhost:8000/health/ready](http://localhost:8000/health/ready). | - HTTP 200 OK. Kiểm tra kết nối tới SQL Server và Redis thành công. | [ ] | [ ] |
| HLT-03 | Detailed Health Checks | 1. Gửi request GET tới [http://localhost:8000/health/details](http://localhost:8000/health/details). | - HTTP 200 OK. Phản hồi đầy đủ thông tin uptime, dung lượng đĩa và tài nguyên hệ thống. | [ ] | [ ] |

---

### 📊 11. Monitoring Stack (Giám sát hạ tầng)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| MON-01 | Prometheus metrics exposition | 1. Truy cập [http://localhost:8000/metrics](http://localhost:8000/metrics). | - Hiển thị danh sách các chỉ số chuẩn OpenTelemetry và Prometheus. | [ ] | [ ] |
| MON-02 | Prometheus UI Targets | 1. Truy cập [http://localhost:9090/targets](http://localhost:9090/targets). | - Endpoint `tasksync-backend` hiển thị trạng thái `UP` (xanh). | [ ] | [ ] |
| MON-03 | Grafana Dashboard | 1. Truy cập [http://localhost:3000](http://localhost:3000). <br>2. Đăng nhập bằng `admin` / `admin`. <br>3. Mở Dashboard của TaskSyncEnterprise. | - Hiển thị biểu đồ realtime về request rate, latency, memory usage, CPU load. | [ ] | [ ] |
| MON-04 | Redis Metrics | 1. Kiểm tra cache hit/miss hoặc số lượng keys lưu trữ trên Grafana/Prometheus. | - Hiển thị chỉ số tương tác giữa Backend và Redis chính xác. | [ ] | [ ] |

---

### 🛡️ 12. CI/CD & Security (Quy trình tự động hóa)

| ID | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Pass | Fail |
|---|---|---|---|---|---|
| SEC-01 | Bandit SAST Scan | 1. Chạy quét Bandit cục bộ: `bandit -c pyproject.toml -r .` tại `backend/`. | - Chạy hoàn tất, không phát hiện lỗ hổng nghiêm trọng mức High. | [ ] | [ ] |
| SEC-02 | pip-audit SCA Scan | 1. Chạy `pip-audit -r requirements.txt --ignore-vuln PYSEC-2026-1325` tại `backend/`. | - Quét thành công các package, không có lỗ hổng CVE nào khác ngoài lỗi ecdsa đã được bỏ qua một cách an toàn. | [ ] | [ ] |
| CICD-01 | GitHub Actions CI Execution | 1. Tạo PR hoặc đẩy commit lên nhánh `develop`. | - Pipeline `ci.yml` chạy tự động và chuyển sang màu xanh (Green Build). | [ ] | [ ] |
| DOCK-01 | Khởi động Docker Compose sạch | 1. Thực thi `docker compose down -v`. <br>2. Khởi động lại `docker compose up -d --build`. | - Build Dockerfile đa tầng thành công. <br>- SQL Server, Redis, Backend khởi tạo tự động, cấu hình mạng network thông suốt. | [ ] | [ ] |

---

## 🛑 Báo cáo Kết quả (Test Summary)

*   **Tổng số kịch bản kiểm thử (Total Test Cases):** 28
*   **Số kịch bản ĐẠT (Passed):** ______ / 28
*   **Số kịch bản LỖI (Failed):** ______ / 28
*   **Người kiểm thử (Tester):** ________________________
*   **Ngày kiểm thử (Date):** ____/____/2026

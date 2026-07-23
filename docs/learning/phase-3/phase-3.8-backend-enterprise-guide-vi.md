# Hướng Dẫn Kỹ Thuật Backend Doanh Nghiệp (Phase 3.8 Backend Enterprise Guide)

Chào mừng các nhà phát triển đến với tài liệu hướng dẫn kỹ thuật chuyên sâu của dự án **TaskSyncEnterprise**. Tài liệu này giải thích chi tiết các công nghệ, quy trình, tiêu chuẩn thiết kế và vận hành hệ thống theo mô hình doanh nghiệp lớn.

---

## 🚀 1. CI/CD & Tự Động Hóa Với GitHub Actions

### Tại sao dùng?
Trong các dự án phần mềm doanh nghiệp, nhiều lập trình viên cùng làm việc trên một repository. Nếu không có hệ thống kiểm tra tự động, việc gộp code (merge code) thủ công rất dễ gây ra lỗi logic (regression bugs), phá hỏng cấu trúc hệ thống, hoặc lọt các lỗi cú pháp. CI (Continuous Integration - Tích hợp liên tục) sinh ra để giải quyết vấn đề này bằng cách tự động hóa hoàn toàn việc kiểm tra chất lượng mã nguồn mỗi khi có thay đổi.

### Khi nào dùng?
*   Chạy tự động mỗi khi nhà phát triển tạo một Pull Request (PR) hướng tới nhánh `develop` hoặc `master`.
*   Chạy tự động khi một commit được đẩy (push) trực tiếp lên nhánh `develop` để đảm bảo nhánh tích hợp luôn ở trạng thái "xanh" (Green Build).
*   Chạy thủ công (Workflow Dispatch) khi cần xác minh nhanh tình trạng mã nguồn.

### Cách doanh nghiệp áp dụng & Ví dụ thực tế
Doanh nghiệp thiết lập các **chốt chặn nghiêm ngặt (Branch Protection Rules)** trên GitHub. Nhánh `develop` và `master` bị khóa không cho phép commit trực tiếp. Để merge code vào, PR bắt buộc phải vượt qua tất cả các bước của luồng CI:
1.  **Linter check (Ruff & Black):** Định dạng code nhất quán.
2.  **Unit Tests (Pytest):** Phải vượt qua 100% số lượng test case và đạt tỷ lệ bao phủ (Code Coverage) tối thiểu quy định (ví dụ 80%).
3.  **Security Scan:** Không có cảnh báo bảo mật nghiêm trọng.

*Ví dụ thực tế:* Một lập trình viên viết code mới nhưng vô tình làm thay đổi kiểu dữ liệu trả về của API đăng nhập. Khi tạo PR, luồng CI chạy test suite tự động phát hiện lỗi kiểm thử của API này bị thất bại (`AssertionError`), từ đó chặn đứng lỗi này trước khi nó kịp triển khai lên môi trường thử nghiệm (Staging).

---

## 🛡️ 2. Quét Bảo Mật Tĩnh (SAST) & Kiểm Tra Thư Viện (SCA)

Bảo mật là ưu tiên hàng đầu của các hệ thống doanh nghiệp lớn. Dự án sử dụng hai công cụ quét tự động: **Bandit** và **pip-audit**.

### 🔍 Bandit (SAST - Static Application Security Testing)
*   **Tại sao & Khi nào dùng:** Bandit phân tích cú pháp code Python mà không cần chạy ứng dụng nhằm phát hiện các lỗi lập trình mất an toàn thường gặp (như dùng hàm băm MD5 yếu, SQL Injection bằng cách cộng chuỗi trực tiếp, hoặc hardcode thông tin nhạy cảm). Công cụ này chạy mỗi khi viết code mới hoặc trước khi đóng gói sản phẩm.
*   **Cách doanh nghiệp áp dụng:** Tích hợp trực tiếp vào CI. Cấu hình file `pyproject.toml` để loại bỏ các thư mục như `.venv`, `tests` để tránh cảnh báo giả (false positives). Chặn đứng việc build nếu phát hiện lỗi bảo mật có mức độ nghiêm trọng cao (High Severity).
*   **Ví dụ thực tế:** Một lập trình viên tạm thời viết `token = "super-secret-key-123"` vào code để test và quên xóa. Bandit lập tức bắt được lỗi này (cảnh báo `B105: Hardcoded password string`) và đánh trượt luồng CI, yêu cầu lập trình viên phải đưa key vào biến môi trường `.env`.

### 📦 pip-audit (SCA - Software Composition Analysis)
*   **Tại sao & Khi nào dùng:** Ứng dụng hiện đại phụ thuộc rất nhiều vào các thư viện bên thứ ba (PyPI). Lỗ hổng bảo mật (CVE) mới trong các thư viện này được phát hiện hàng ngày. `pip-audit` đối chiếu toàn bộ thư viện khai báo trong `requirements.txt` với cơ sở dữ liệu OSV (Open Source Vulnerabilities) để phát hiện và cảnh báo các phiên bản thư viện có chứa lỗ hổng bảo mật đã biết.
*   **Cách doanh nghiệp áp dụng:** Chạy quét hàng ngày hoặc mỗi khi build sản phẩm. Doanh nghiệp phân loại lỗ hổng:
    *   *Lỗ hổng nghiêm trọng:* Yêu cầu nâng cấp thư viện ngay lập tức.
    *   *Lỗ hổng được chấp nhận (Accepted Vulnerabilities):* Nếu lỗ hổng nằm ở nhánh tính năng không sử dụng hoặc đã có giải pháp thay thế tạm thời.
*   **Ví dụ thực tế (Trường hợp ecdsa):** Trong dự án hiện tại, lỗ hổng `PYSEC-2026-1325` thuộc thư viện `ecdsa` (phục vụ JWT thông qua `python-jose`) được hệ thống chấp nhận tạm thời vì ứng dụng chỉ sử dụng thuật toán đối xứng `HS256`, hoàn toàn không sử dụng chữ ký bất đối xứng ECDSA. Lỗ hổng này được cấu hình bỏ qua thông qua cờ `--ignore-vuln` trong CI để tránh chặn tiến trình phát triển vô lý.

---

## 🐳 3. Đóng Gói Docker & Hardening Môi Trường Sản Xuất (Production Hardening)

### Tại sao dùng?
Docker giúp đóng gói toàn bộ mã nguồn, môi trường chạy (Python runtime, OS libraries) và các cấu hình hệ thống vào một container duy nhất. Điều này đảm bảo tính nhất quán tuyệt đối: *"Chạy được trên máy dev thì chắc chắn chạy được trên production"*.

### Cách doanh nghiệp áp dụng & Ví dụ thực tế
Trong doanh nghiệp, việc bảo mật hình ảnh container (Docker Image) rất quan trọng để tránh bị tấn công leo thang đặc quyền. Chúng ta áp dụng các kỹ thuật **Production Hardening** sau:
1.  **Multi-stage Build (Dựng đa tầng):** Sử dụng một container đầy đủ công cụ để build (ví dụ cài đặt complier, pip tools), sau đó chỉ sao chép các file thực thi cuối cùng sang một container chạy siêu nhẹ (như `python:3.12-slim` hoặc `alpine`). Điều này giúp giảm 70% dung lượng image và loại bỏ các công cụ có thể bị khai thác tấn công.
2.  **Non-root User (Chạy không có quyền root):** Theo mặc định, các tiến trình trong container chạy bằng quyền `root`. Trên production, cấu hình container chạy bằng một user thường (ví dụ: `useradd -u 1001 appuser`). Nếu hacker khai thác được lỗi thực thi mã độc trong app, họ cũng không thể kiểm soát hệ thống máy chủ host.
3.  **Security Options:** Cấu hình `--security-opt no-new-privileges:true` để ngăn chặn các tiến trình con tự ý tăng quyền hạn.

---

## 📊 4. Giám Sát Chi Tiết (Observability) Với Prometheus & Grafana

Giám sát trong môi trường doanh nghiệp không chỉ là ghi nhận lỗi (logging) mà là toàn diện ba cột trụ: **Metrics (Chỉ số), Logs (Nhật ký), và Traces (Vết giao dịch)**.

```
                  ┌────────────── Observability Stack ─────────────┐
                  │                                                │
       FastAPI ───┼──► [Metrics] ──────► Prometheus ──► Grafana    │
   OpenTelemetry  ├──► [Structured Logs] ──► ELK/Loki               │
                  └──► [Distributed Traces] ──► Jaeger/Tempo       │
```

### Tại sao dùng?
*   **Prometheus:** Thu thập các chỉ số dạng số theo thời gian thực (ví dụ: số lượng HTTP request mỗi giây, thời gian phản hồi API trung bình, lượng RAM/CPU tiêu thụ) theo cơ chế kéo (Pull model) thông qua endpoint `/metrics`.
*   **Grafana:** Trực quan hóa dữ liệu từ Prometheus thành các biểu đồ dashboard sinh động, dễ theo dõi, đồng thời thiết lập cảnh báo tự động (Alerting) qua Slack/Email/Telegram.
*   **OpenTelemetry:** Tiêu chuẩn hóa việc thu thập metrics và traces xuyên suốt các dịch vụ giúp phát hiện nghẽn cổ chai (bottlenecks) giữa backend, database, và cache.

### Ví dụ thực tế trong doanh nghiệp
Hệ thống đang hoạt động bình thường bỗng dưng chạy chậm vào lúc 9 giờ sáng. Admin kiểm tra Grafana dashboard và phát hiện:
*   Đồ thị `http_requests_total` tăng đột biến 5 lần.
*   Độ trễ API `/api/v1/tasks` tăng từ `50ms` lên `3000ms`.
*   Kết nối SQL Server đạt ngưỡng giới hạn (Connection Pool exhaustion).
Nhờ các chỉ số trực quan này, đội ngũ vận hành SRE lập tức đưa ra quyết định tăng thêm số lượng bản sao backend container (Auto-scaling) để giải quyết nghẽn kết nối cơ sở dữ liệu.

---

## 🌿 5. Mô Hình Phân Nhánh Git Workflow Doanh Nghiệp

Dự án áp dụng quy chuẩn Git Flow chặt chẽ để quản lý mã nguồn song song nhiều phiên bản:

*   `master`: Nhánh mã nguồn cực kỳ ổn định. Chỉ chứa code đã được kiểm thử kỹ lưỡng từ Staging và sẵn sàng phát hành ra khách hàng.
*   `develop`: Nhánh tích hợp chính của các nhà phát triển. Mọi tính năng mới sau khi test xong cục bộ đều được gộp về đây.
*   `feature/*` (Ví dụ `feature/task-attachment`): Nhánh tính năng ngắn hạn tách ra từ `develop`. Sau khi hoàn thành, tạo Pull Request để gộp lại về `develop`.
*   `bugfix/*` (Ví dụ `bugfix/login-cookie-timeout`): Nhánh sửa lỗi nóng tách ra từ `develop` để xử lý các sự cố phát hiện trong quá trình tích hợp.

*Nguyên tắc doanh nghiệp:* Tuyệt đối không commit trực tiếp lên `master` hay `develop`. Tất cả các thay đổi phải thông qua Pull Request, yêu cầu có ít nhất 1 Senior Developer phê duyệt (Review & Approve) và luồng CI chạy thành công hoàn toàn.

---

## 🏗️ 6. Kiến Trúc Backend Doanh Nghiệp (Clean Architecture)

Backend của `TaskSyncEnterprise` được viết bằng **FastAPI** dựa trên các tiêu chí thiết kế hướng tới phát triển quy mô lớn:

### 🧩 Phân lớp thư mục rõ ràng (Separation of Concerns)
*   **Routers (Lớp API):** Chỉ xử lý tiếp nhận request từ Client, kiểm tra xác thực phân quyền (RBAC deps) và trả về response. Không chứa logic nghiệp vụ hay SQL query.
*   **Services (Lớp Nghiệp vụ):** Nơi xử lý logic nghiệp vụ chính (Business logic) như tính toán phép năm, xử lý đính kèm tệp tin, điều phối luồng gửi email.
*   **Repositories / CRUD (Lớp Dữ liệu):** Trực tiếp giao tiếp với SQL Server thông qua SQLAlchemy ORM để thực thi các câu lệnh select, insert, update.

### ♻️ Quản lý Cơ sở dữ liệu và Audit nâng cao
1.  **Dependency Injection (DI):** Dùng `Depends(get_db)` của FastAPI để quản lý vòng đời Session kết nối cơ sở dữ liệu một cách an toàn, tự động đóng session khi request kết thúc nhằm tránh rò rỉ bộ nhớ (connection leaks).
2.  **Soft Delete (Xóa mềm):** Mọi bảng dữ liệu kế thừa `AuditMixin` đều không bị xóa vật lý khỏi đĩa cứng. Lệnh xóa thực chất sẽ set flag `is_deleted = True` và ghi nhận `deleted_at`. Điều này giúp bảo toàn dữ liệu lịch sử và khôi phục khi cần thiết.
3.  **Automatic Auditing (Ghi vết tự động):** Lắng nghe sự kiện của SQLAlchemy để tự động ghi lại lịch sử thao tác: Ai tạo bản ghi, chỉnh sửa lúc nào, chỉnh sửa nội dung gì.

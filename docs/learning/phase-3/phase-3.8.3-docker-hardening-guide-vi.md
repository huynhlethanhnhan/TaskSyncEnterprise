# Hướng Dẫn Kỹ Thuật: Bảo Mật & Tối Ưu Hóa Docker Image Doanh Nghiệp (Phase 3.8.3)

Tài liệu này cung cấp kiến thức nền tảng và các hướng dẫn chuyên sâu bằng tiếng Việt về việc đóng gói, tối ưu hóa và bảo mật Docker image cho hệ thống `TaskSyncEnterprise`. Đây là cẩm nang hữu ích cho các kỹ sư DevOps, SRE, và các bạn sinh viên muốn làm quen với các khái niệm DevSecOps trong thực tế.

---

## 🎯 1. Lý Thuyết Containerization & Docker Image

### Docker Image vs. Container
*   **Docker Image (Ảnh Docker):** Là một mẫu (template) chỉ đọc (read-only), bao gồm hệ điều hành tối giản, mã nguồn, thư viện và cấu hình cần thiết để chạy ứng dụng. Image mang tính tĩnh (static) và được lưu trữ trong Registry.
*   **Docker Container (Vỏ bọc chạy ngầm):** Là một thực thể thực thi (runtime instance) của một image. Container mang tính động (dynamic), có lớp ghi (writable layer) riêng xếp trên các lớp chỉ đọc của image.
*   *Lệnh kiểm tra:*
    ```bash
    # Xem danh sách image đang có
    docker images
    # Xem danh sách container đang chạy
    docker ps
    ```

### Docker Build Context (Ngữ cảnh Build)
Khi bạn chạy `docker build .`, thư mục hiện hành sẽ được nén và gửi tới Docker Daemon dưới dạng "build context". Nếu thư mục chứa nhiều file rác (như `.venv`, `*.db`, logs, `.git`), quá trình build sẽ chậm và có nguy cơ rò rỉ dữ liệu nhạy cảm vào image layers.
*   **Giải pháp:** Sử dụng tệp [.dockerignore](file:///e:/TaskSyncEnterprise/backend/.dockerignore) để chủ động loại bỏ các file không cần thiết.

### Cơ chế Layer Caching (Bộ nhớ đệm tầng)
Docker build hoạt động theo cơ chế xếp chồng các tầng thay đổi (layers). Nếu một layer không đổi, Docker sẽ tái sử dụng cache thay vì chạy lại lệnh đó.
*   **Mẹo tối ưu:** Copy file khai báo thư viện (`requirements.txt`) và chạy `pip install` trước khi copy toàn bộ mã nguồn. Vì mã nguồn thay đổi thường xuyên, trong khi danh sách thư viện ít khi đổi, điều này giúp tối ưu hóa thời gian build.

---

## 🔒 2. Kỹ Thuật Giảm Thiểu Diện Tích Tấn Công (Attack Surface Reduction)

### Multi-Stage Builds (Build Đa Tầng)
Kỹ thuật chia Dockerfile thành nhiều giai đoạn (stages) sử dụng các lệnh `FROM ... AS ...`.
*   **Builder stage:** Cài đặt các công cụ biên dịch nặng như `build-essential`, `gcc` để build thư viện Python (như `pymssql`, `bcrypt`).
*   **Runner stage:** Chỉ copy các thư viện đã biên dịch hoàn chỉnh (ví dụ từ thư mục `/opt/venv`) sang một base image siêu sạch, loại bỏ hoàn toàn compiler để ngăn chặn hacker lạm dụng chúng nếu container bị xâm nhập.

### Tại sao nên dùng Slim Images thay vì Full/Alpine Images?
*   **Slim Images (ví dụ `python:3.12-slim`):** Dựa trên Debian tối giản, loại bỏ các tiện ích không cần thiết nhưng vẫn giữ tính tương thích cao với các thư viện native C/C++ thông qua `glibc`.
*   **Alpine Images (ví dụ `python:3.12-alpine`):** Rất nhẹ nhưng sử dụng thư viện `musl libc` thay vì `glibc`. Một số thư viện Python biên dịch sẵn (wheels) không hỗ trợ `musl`, dẫn đến việc Docker phải tải mã nguồn về biên dịch lại từ đầu, làm tăng thời gian build và dễ gây lỗi runtime tiềm ẩn.
*   **Xóa file thừa trong cùng layer:** Khi bạn chạy `apt-get install`, hãy xóa bộ nhớ đệm bằng `&& rm -rf /var/lib/apt/lists/*` trong cùng một lệnh `RUN` đó. Nếu xóa ở một lệnh `RUN` riêng biệt sau đó, file rác vẫn nằm ở layer trước đó và không làm giảm kích thước thực của image cuối cùng.

---

## 🛡️ 3. Phân Quyền Hạn Chế (Least Privilege & Non-Root Execution)

### Tại sao không bao giờ chạy Container bằng quyền Root?
Mặc định, các tiến trình bên trong container chạy dưới quyền `root` (UID 0). Nếu hacker khai thác được lỗ hổng thực thi mã độc từ xa (RCE) trong ứng dụng FastAPI, họ sẽ có quyền root bên trong container và có thể thoát ra ngoài máy chủ vật lý (container escape).

### UID, GID và Phân quyền Filesystem
Chúng ta tạo một user/group riêng biệt không có quyền quản trị:
```dockerfile
# Tạo group và user tasksync với UID/GID cố định là 10001
RUN groupadd -g 10001 tasksync \
    && useradd -u 10001 -g tasksync -m -s /sbin/nologin tasksync
```
Sau đó, chuyển quyền sở hữu mã nguồn cho user này bằng cờ `COPY --chown=tasksync:tasksync . .` và thiết lập môi trường chạy với lệnh `USER tasksync`.

### Writable Paths (Các phân vùng ghi dữ liệu)
Tiến trình phi quyền đô thị chỉ được phép ghi dữ liệu vào các thư mục được cấp quyền rõ ràng:
1.  `/app/uploads`: Lưu trữ avatars và tệp đính kèm nhiệm vụ.
2.  `/app/logs`: Lưu trữ logs xoay vòng của hệ thống.
3.  `/tmp` (hoặc `/app/tmp`): Phục vụ lưu file tạm thời.

---

## ⚙️ 4. Runtime Isolation & Security Opts (Cô lập runtime)

### Linux Capabilities (Khả năng nhân Linux)
Theo mặc định, Docker cấp một tập hợp các đặc quyền nhân (capabilities) cho container. Ở môi trường sản xuất, ta nên thu hồi toàn bộ các quyền này bằng cờ `cap_drop: [ALL]` trong Docker Compose để vô hiệu hóa các thao tác can thiệp sâu hệ thống (như thay đổi network route, mount ổ đĩa).

### no-new-privileges:true
Ngăn chặn các tiến trình con bên trong container tự động nâng quyền (ví dụ thông qua các file chạy `setuid` hoặc `setgid`).
*   *Lệnh thiết lập:* `security_opt: [ "no-new-privileges:true" ]`

### Read-Only Root Filesystem & tmpfs
Chạy container với tùy chọn root filesystem chỉ đọc (`read_only: true`) ngăn chặn hacker ghi mã độc, trojan vào các thư mục hệ thống như `/usr/bin` hay `/opt`.
*   Các vùng cần ghi dữ liệu tạm sẽ được gắn kiểu `tmpfs` (RAM ảo) hoặc mounted volume cố định.

---

## 🩺 5. Giám Sát Sức Khỏe (SRE Health Checks)

### Liveness vs. Readiness Probes
*   **Liveness check (Đang sống):** Xác định container có đang hoạt động hay không. Nếu liveness check thất bại, Docker hoặc Kubernetes sẽ khởi động lại container. Đầu endpoint lý tưởng là `/health/live` (chỉ trả lời 200 OK đơn giản).
*   **Readiness check (Đã sẵn sàng):** Xác định container đã sẵn sàng nhận traffic thực tế chưa (ví dụ đã kết nối DB, Redis thành công chưa). Thất bại ở đây chỉ làm container tạm ngừng nhận request chứ không bị restart liên tục. Đầu endpoint lý tưởng là `/health/ready`.

### Viết Lệnh HEALTHCHECK Không Phụ Thuộc Tiện Ích Ngoài
Tránh cài đặt `curl` hay `wget` vào runner image chỉ để phục vụ health check vì chúng làm tăng diện tích tấn công. Thay vào đó, hãy tận dụng thư viện có sẵn trong Python:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')" || exit 1
```

---

## 📦 6. Quản Lý Lỗ Hổng & SBOM

### Dependency & Image Pinning (Chốt chặn phiên bản)
*   **Image Tag:** Không bao giờ dùng `:latest` ở môi trường sản xuất. Luôn chỉ rõ mã phiên bản cụ thể (ví dụ `python:3.12.10-slim`).
*   **Dependency pinning:** Chốt cứng phiên bản trong `requirements.txt` bằng toán tử `==` (ví dụ `fastapi==0.139.1`) để tránh việc tự động nâng cấp phiên bản gặp lỗi không tương thích.

### SBOM (Software Bill of Materials) & CVE Scanning
*   **SBOM:** Một danh sách liệt kê tất cả các thành phần phần mềm, thư viện của bên thứ ba đang được tích hợp bên trong Docker image (có thể xuất ra bằng công cụ `Syft`).
*   **Vulnerability Scanning (Quét lỗ hổng bảo mật):** Sử dụng các công cụ như `Trivy` hay `Docker Scout` để phân tích image và đối chiếu mã thư viện với cơ sở dữ liệu lỗi bảo mật quốc tế (CVE).

---

## 🖥️ 7. Hướng Dẫn Thực Hành Cho Học Viên (Commands for Inspection)

Dưới đây là danh sách các lệnh bạn có thể chạy trên máy để kiểm chứng các khái niệm trên:

```bash
# 1. Kiểm tra tiến trình đang chạy bên trong container bằng user nào
docker exec tasksync-backend id

# 2. Xem lịch sử các layer và dung lượng của từng layer trong image
docker history tasksync-backend:prod

# 3. Kiểm tra trạng thái health check chi tiết của container
docker inspect --format='{{json .State.Health}}' tasksync-backend-test

# 4. Quét bảo mật Docker Image bằng Trivy (nếu máy có cài Trivy)
trivy image tasksync-backend:prod

# 5. Xem dung lượng thực tế của các Docker Image
docker images tasksync-backend
```

---

## 🛠️ 8. Các Sự Cố Quyền Hạn Thường Gặp Trên Windows (WSL2/Docker Desktop)
Khi phát triển Docker trên hệ điều hành Windows sử dụng WSL2:
*   **Lỗi phân quyền file mount (Mount Permissions):** WSL2 tự động ánh xạ quyền truy cập từ Windows (NTFS) sang Linux. Đôi khi file được mount vào container sẽ mặc định có quyền `777` hoặc thuộc sở hữu của `root`.
*   **Xử lý:** Tránh bind-mount các thư mục chứa mã nguồn ở môi trường production. Hãy copy trực tiếp file vào image và sử dụng chỉ thị `--chown` như đã thiết lập trong Dockerfile để đảm bảo phân quyền chính xác độc lập với máy chủ Windows host.

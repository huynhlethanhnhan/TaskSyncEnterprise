# Hướng Dẫn Sử Dụng & Vận Hành Docker Và Redis

Tài liệu này hướng dẫn chi tiết từ cấp độ cơ bản về cách triển khai, cấu hình, giám sát và xử lý các sự cố liên quan đến Docker và Redis trong môi trường phát triển và vận hành của dự án TaskSyncEnterprise.

---

## 1. Khái Niệm Cơ Bản Về Docker & Redis

### 1.1. Docker Desktop & WSL2 là gì?
*   **Docker Desktop:** Là ứng dụng giao diện đồ họa trực quan trên Windows giúp lập trình viên đóng gói, kiểm thử và chạy các ứng dụng trong các môi trường cô lập gọi là Containers.
*   **WSL2 (Windows Subsystem for Linux 2):** Là một phân vùng kiến trúc nhân Linux thực thụ do Microsoft tích hợp vào Windows. Docker Desktop sử dụng WSL2 làm nhân (Back-end engine) để chạy các Linux Containers trực tiếp trên Windows với hiệu năng gần như bản xứ (native speed) và tiết kiệm RAM tối đa.

### 1.2. Các thuật ngữ cốt lõi trong Docker
*   **Image (Ảnh chụp đóng gói):** Giống như một bản thiết kế hoặc đĩa cài đặt hệ điều hành tĩnh, chứa toàn bộ mã nguồn, thư viện và môi trường cần thiết để chạy một ứng dụng (ví dụ: `redis:7-alpine`).
*   **Container (Thực thể chạy):** Là một thực thể sống được tạo ra từ Image. Nó chạy độc lập và cô lập với hệ điều hành máy host.
*   **Port Mapping (Ánh xạ cổng):** Cơ chế nối luồng mạng giữa máy host và Container. Cú pháp `-p 6379:6379` nghĩa là bất kỳ truy cập nào tới cổng 6379 trên máy vật lý (Windows) sẽ được chuyển hướng thẳng vào cổng 6379 bên trong Container Redis.
*   **Volume (Ổ đĩa chia sẻ):** Docker Containers mặc định là không lưu trạng thái (Ephemeral). Khi Container bị xóa, dữ liệu lưu bên trong nó cũng mất sạch. Volume giúp ánh xạ một thư mục trên máy host vào bên trong Container để lưu trữ dữ liệu bền vững (như tệp cấu hình hoặc dữ liệu Redis).

---

## 2. Các Lệnh Docker Thường Dùng

Dưới đây là danh sách các lệnh quản trị Docker quan trọng nhất mà lập trình viên cần nắm vững:

| Lệnh | Ý nghĩa | Ví dụ thực tế |
| :--- | :--- | :--- |
| `docker ps` | Hiển thị các container đang chạy | `docker ps -a` (hiển thị cả container đã tắt) |
| `docker images` | Liệt kê các images đã tải về máy | `docker images` |
| `docker logs` | Xem nhật ký hoạt động (logs) của container | `docker logs -f tasksync-redis` (xem logs thời gian thực) |
| `docker inspect` | Xem thông tin chi tiết cấu hình container | `docker inspect tasksync-redis` |
| `docker exec` | Chạy một lệnh trực tiếp bên trong container | `docker exec -it tasksync-redis redis-cli` |
| `docker restart` | Khởi động lại container | `docker restart tasksync-redis` |
| `docker stop` | Dừng container đang chạy | `docker stop tasksync-redis` |
| `docker start` | Khởi động lại container đang tắt | `docker start tasksync-redis` |

---

## 3. Các Lệnh Redis-cli Căn Bản Để Tương Tác

Để thực thi các lệnh dưới đây, trước tiên bạn cần kết nối vào môi trường dòng lệnh của Redis bằng cú pháp:
`docker exec -it tasksync-redis redis-cli`

### 3.1. Nhóm lệnh kiểm tra sức khỏe
*   `PING`: Trả về `PONG` nếu kết nối thành công.
*   `INFO`: Trả về toàn bộ thông tin chi tiết về hệ thống Redis (CPU, RAM, số lượng key, phiên bản, kết nối đang mở).
*   `INFO memory`: Trả về chi tiết lượng RAM đang sử dụng (`used_memory_human`).

### 3.2. Nhóm lệnh thao tác Key
*   `KEYS [pattern]` (Không khuyến khích dùng): Tìm kiếm tất cả khóa khớp mẫu (ví dụ: `KEYS employee:*`). *Cảnh báo: Không chạy lệnh này trên môi trường sản xuất (Production).*
*   `SCAN [cursor] MATCH [pattern] COUNT [number]`: Duyệt tìm các key không chặn. Thích hợp để tìm key khớp mẫu trên môi trường lớn.
    *   *Ví dụ:* `SCAN 0 MATCH employee:list:* COUNT 100`
*   `TTL [key]`: Kiểm tra thời gian sống còn lại của một key (tính bằng giây).
    *   Trả về `-1` nếu key tồn tại nhưng không được thiết lập TTL.
    *   Trả về `-2` nếu key không tồn tại.
*   `DEL [key]`: Xóa một key cụ thể khỏi Redis.

### 3.3. Nhóm lệnh dọn dẹp & Giám sát
*   `FLUSHDB`: Xóa toàn bộ key trong database hiện tại (mặc định là DB 0).
*   `FLUSHALL`: Xóa toàn bộ key trong tất cả database của Redis.
*   `MONITOR`: Xem tất cả lệnh gọi mà ứng dụng FastAPI gửi tới Redis theo thời gian thực (real-time). Đây là công cụ đắc lực nhất để debug luồng Caching.

---

## 4. Sao Lưu (Backup) & Khôi Phục (Restore) Dữ Liệu Redis

Redis mặc định lưu trữ dữ liệu bền vững vào một file có tên là `dump.rdb` nằm trong thư mục `/data` của container.

### 4.1. Cách Backup dữ liệu
1.  Kết nối vào CLI: `docker exec -it tasksync-redis redis-cli`
2.  Chạy lệnh `SAVE` hoặc `BGSAVE` để ghi toàn bộ dữ liệu hiện tại trên RAM xuống file `dump.rdb`. Lệnh `BGSAVE` chạy ngầm nên không chặn các tác vụ khác.
3.  Sao chép file `dump.rdb` ra ngoài máy vật lý:
    `docker cp tasksync-redis:/data/dump.rdb C:\backups\redis_dump.rdb`

### 4.2. Cách Restore dữ liệu
1.  Dừng container Redis hiện tại: `docker stop tasksync-redis`
2.  Chạy container mới và gắn tệp `dump.rdb` đã sao lưu vào thư mục `/data` của container:
    `docker run -d --name tasksync-redis -p 6379:6379 -v C:\backups\redis_dump.rdb:/data/dump.rdb redis:7-alpine`
3.  Khởi động lại container, Redis sẽ tự động nạp file `dump.rdb` vào bộ nhớ RAM khi khởi tạo.

---

## 5. Các Sự Cố Thường Gặp & Cách Khắc Phục

### 5.1. Lỗi xung đột cổng 6379 (Port Conflict)
*   **Biểu hiện:** Khi khởi động container Redis, Docker báo lỗi: `Bind for 0.0.0.0:6379 failed: port is already allocated`.
*   **Nguyên nhân:** Có một thực thể Redis cài đặt trực tiếp trên hệ điều hành Windows đang chạy ngầm và chiếm giữ cổng 6379.
*   **Cách xử lý:**
    1.  Mở Command Prompt (Admin) trên Windows và tìm PID chiếm dụng cổng:
        `netstat -ano | findstr :6379`
    2.  Tắt dịch vụ chiếm dụng:
        `taskkill /PID [PID_TÌM_THẤY] /F`
    3.  Hoặc vào Windows Services, tìm dịch vụ "Redis" và chuyển sang chế độ "Disabled".

### 5.2. Docker Desktop không khởi động được do WSL2 lỗi
*   **Biểu hiện:** Docker báo lỗi "WSL 2 installation is incomplete" hoặc treo cứng ở màn hình "Docker Desktop is starting...".
*   **Cách xử lý:**
    1.  Mở PowerShell với quyền Admin và cập nhật nhân WSL:
        `wsl --update`
    2.  Khởi động lại dịch vụ LxssManager:
        `net stop LxssManager` rồi `net start LxssManager`
    3.  Khởi động lại máy tính.

### 5.3. Redis báo lỗi `OOM command not allowed when used memory > 'maxmemory'`
*   **Biểu hiện:** Ứng dụng ghi lỗi vào logs, Redis từ chối lưu các key mới.
*   **Nguyên nhân:** Redis đã sử dụng hết hạn mức RAM được cấu hình trên hệ thống.
*   **Cách xử lý:**
    1.  Mở `redis-cli` và cấu hình chính sách giải phóng key khi bộ nhớ đầy (Eviction Policy):
        `CONFIG SET maxmemory-policy allkeys-lru` (Tự động xóa các key ít được sử dụng nhất khi đầy RAM).
    2.  Hoặc tăng dung lượng RAM tối đa cho phép:
        `CONFIG SET maxmemory 512mb` (Đặt giới hạn 512MB RAM).

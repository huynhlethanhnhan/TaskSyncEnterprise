# Hướng dẫn Kỹ thuật: Nginx, Reverse Proxy & Kiến trúc HTTPS (Phase 3.8.6)

Tài liệu này cung cấp kiến thức nền tảng và hướng dẫn vận hành chi tiết về **Nginx, Reverse Proxy, Docker Networking và HTTPS Security** cho hệ thống **TaskSyncEnterprise**.

---

## 📚 14 Câu hỏi Kiến thức Cốt lõi (Educational Guide)

### 1. Nginx là gì?
Nginx (phát âm là "Engine-X") là một máy chủ web (Web Server) và Reverse Proxy hiệu năng cao, nhẹ và có khả năng xử lý hàng chục nghìn kết nối đồng thời nhờ kiến trúc bất đồng bộ (event-driven asynchronous architecture). Trong hệ thống TaskSyncEnterprise, Nginx đóng vai trò là **API Gateway / Single Entry Point** duy nhất cho mọi request từ phía client (trình duyệt).

### 2. Reverse Proxy là gì?
- **Forward Proxy:** Đại diện cho Client để truy cập ra Internet (ví dụ: VPN, công ty chặn website).
- **Reverse Proxy:** Đại diện cho Server để tiếp nhận tất cả request từ người dùng phía ngoài, sau đó điều hướng (route) request đến các dịch vụ bên trong (Frontend React, FastAPI Backend, Microservices). Trình duyệt không hề biết thông tin IP hay port thực sự của dịch vụ phía sau.

### 3. Vì sao không public Backend trực tiếp ra Internet?
Nói KHÔNG với việc public trực tiếp Uvicorn/FastAPI port 8000 ra môi trường Production vì:
- **Bảo mật:** Backend ẩn hoàn toàn trong Docker internal network (`tasksync-backend-network`), giảm diện tích tấn công (Attack Surface).
- **Bảo vệ chống DoS/DDoS:** Nginx xử lý việc phân giải request, nén GZIP, rate limit và kiểm soát dung lượng request (`client_max_body_size`) nhanh hơn ứng dụng Python/Node.js.
- **Quản lý SSL/TLS tập trung:** Chỉ cần cài đặt HTTPS certificate tại Nginx mà không cần cấu hình mã hóa SSL phức tạp bên trong code ứng dụng.
- **Tải tĩnh (Static Files):** Nginx phục vụ static assets (HTML/CSS/JS, hình ảnh avatar, tệp đính kèm) hiệu quả gấp nhiều lần so với ứng dụng backend.

### 4. Docker DNS hoạt động như thế nào?
Trong một Docker custom network (ví dụ `tasksync-frontend-network` hoặc `tasksync-backend-network`), Docker tích hợp sẵn dịch vụ DNS nội bộ (Embedded DNS Server tại IP `127.0.0.11`). 
- Các container có thể gọi nhau bằng **Service Name** (ví dụ: `http://backend:8000` hoặc `http://frontend:8080`) thay vì dùng địa chỉ IP tĩnh.
- Docker DNS tự động phân giải tên service thành IP container tương ứng.
- **Tuyệt đối không dùng `localhost`** trong `proxy_pass` của Nginx vì `localhost` bên trong container Nginx chính là chính container Nginx đó, chứ không phải backend!

### 5. Forwarded Headers dùng để làm gì?
Khi Nginx đứng trước Backend, mọi request tới Backend đều có IP nguồn (`remote_addr`) là IP của Nginx container (ví dụ `172.30.0.5`). Backend sẽ bị "mù" thông tin IP thực của người dùng.
Do đó, Nginx truyền các header bổ sung:
- `Host`: Hostname ban đầu mà người dùng gửi lên.
- `X-Real-IP`: IP thực tế của máy khách (Client IP).
- `X-Forwarded-For`: Danh sách IP qua các tầng proxy.
- `X-Forwarded-Proto`: Giao thức thực tế (`http` hoặc `https`).
- `X-Forwarded-Host` & `X-Forwarded-Port`: Domain và Port khách đang truy cập.

Backend FastAPI/Uvicorn cấu hình `--proxy-headers` và `FORWARDED_ALLOW_IPS=172.30.0.0/24` (chỉ trust Nginx subnet) sẽ đọc các header này để ghi log chính xác IP người dùng và phát sinh URL chính xác. Tuyệt đối không dùng `FORWARDED_ALLOW_IPS=*` trong sản xuất!

### 6. HTTP và HTTPS khác nhau thế nào?
- **HTTP (Hypertext Transfer Protocol):** Dữ liệu truyền qua cổng 80 dưới dạng văn bản thuần (plaintext). Bất kỳ ai trên đường truyền (Wi-Fi công cộng, ISP) đều có thể nghe lén hoặc sửa đổi dữ liệu (Man-in-the-Middle - MitM attack).
- **HTTPS (HTTP Secure):** Sử dụng mã hóa SSL/TLS trên cổng 443. Dữ liệu được mã hóa trước khi gửi đi, đảm bảo tính Bảo mật (Confidentiality), Tính toàn vẹn (Integrity) và Xác thực máy chủ (Authentication).

### 7. TLS Certificate và Private Key là gì?
- **Certificate (`server.crt` / `fullchain.pem`):** Khóa công khai (Public Key) chứa thông tin tên miền, tổ chức phát hành và thời hạn hiệu lực. Certificate được công khai cho trình duyệt để xác minh danh tính máy chủ.
- **Private Key (`server.key` / `privkey.pem`):** Khóa bí mật tuyệt đối dùng để giải mã dữ liệu do trình duyệt mã hóa. **KHÔNG BAO GIỜ** được commit Private Key vào Git repository hay tiết lộ ra ngoài!

### 8. Self-signed Certificate khác Let's Encrypt như thế nào?
- **Self-signed Certificate:** Do bạn tự ký (ví dụ qua script PowerShell `generate_self_signed_cert.ps1`). Không được các Tổ chức chứng thực (Certificate Authority - CA) công nhận, nên trình duyệt sẽ cảnh báo đỏ "Your connection is not private" (NET::ERR_CERT_AUTHORITY_INVALID). Thích hợp dùng cho dev/staging nội bộ.
- **Let's Encrypt Certificate:** Chứng chỉ TLS miễn phí, tự động hóa, được các CA toàn cầu tin cậy hoàn toàn. Trình duyệt hiển thị ổ khóa xanh an toàn.

### 9. HSTS là gì và vì sao không nên bật sai?
HSTS (HTTP Strict Transport Security) truyền header `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Header này bắt buộc trình duyệt **chỉ được phép truy cập website qua HTTPS** trong toàn bộ khoảng thời gian `max-age` (ví dụ 1 năm), ngay cả khi người dùng gõ `http://`.
- **Cảnh báo cực kỳ quan trọng:** Không bao giờ bật HSTS trên môi trường Local HTTP! Nếu bật sai, trình duyệt sẽ lưu cache và từ chối kết nối HTTP vào `localhost` trên máy dev, gây lỗi không thể truy cập lại trừ khi xóa HSTS cache của trình duyệt. Chỉ bật HSTS khi HTTPS Production đã chạy ổn định.

### 10. CORS khác Reverse Proxy như thế nào?
- **CORS (Cross-Origin Resource Sharing):** Là cơ chế bảo mật của **trình duyệt (Browser policy)** ngăn không cho trang web từ Domain A (ví dụ `http://localhost:5173`) gọi API sang Domain B (ví dụ `http://localhost:8000`) trừ khi Domain B cho phép qua header `Access-Control-Allow-Origin`.
- **Reverse Proxy:** Khi dùng Nginx, Frontend và Backend cùng nằm chung một Origin (Domain và Port), ví dụ `http://localhost/` và `http://localhost/api/v1/`. Request gọi cùng origin nên trình duyệt **không kích hoạt CORS check**, giúp loại bỏ các lỗi CORS phiền phức trên sản phẩm.

### 11. Cách debug lỗi 502 Bad Gateway
Lỗi `502 Bad Gateway` xuất hiện khi Nginx không thể kết nối tới dịch vụ upstream (Backend hoặc Frontend).
Các bước debug trên Windows PowerShell:
1. Kiểm tra container backend có đang chạy không:
   ```powershell
   docker ps
   ```
2. Kiểm tra log của container backend để xem ứng dụng có bị crash không:
   ```powershell
   docker logs tasksync-backend-prod --tail 50
   ```
3. Kiểm tra log lỗi Nginx:
   ```powershell
   docker logs tasksync-nginx-prod --tail 50
   ```
4. Kiểm tra xem Nginx có cùng Docker Network với Backend hay không:
   ```powershell
   docker network inspect tasksync-backend-network
   ```

### 12. Cách debug lỗi Frontend Refresh 404 (SPA Routing)
Khi người dùng dùng React Router gõ thẳng `http://localhost/login` rồi bấm F5:
- Nếu Nginx không có cấu hình SPA fallback `try_files $uri $uri/ /index.html;`, Nginx sẽ tìm file `/login` trên đĩa cứng và trả về `404 Not Found`.
- Cấu hình `try_files $uri $uri/ /index.html;` hoặc chuyển request `/` sang Frontend Nginx container giúp chuyển giao đường dẫn cho React Router xử lý tại Client side.

### 13. Cách kiểm tra cú pháp Nginx config
Trước khi reload Nginx, luôn chạy lệnh kiểm tra cú pháp:
```powershell
docker exec tasksync-nginx-prod nginx -t
```
Nếu xuất hiện `syntax is ok` và `test is successful`, cấu hình hoàn toàn hợp lệ.

Để reload Nginx không gây ngắt kết nối (zero-downtime reload):
```powershell
docker exec tasksync-nginx-prod nginx -s reload
```

### 14. Cách thay Certificate Production sau này (Let's Encrypt / Cloud CA)
Khi đưa lên máy chủ thật (Production Server):
1. Chạy Certbot để tạo chứng chỉ miễn phí từ Let's Encrypt:
   ```bash
   certbot certonly --standalone -d tasksync.yourdomain.com
   ```
2. Mount thư mục chứng chỉ vào container Nginx trong `docker-compose.production.yml`:
   ```yaml
   volumes:
     - /etc/letsencrypt/live/tasksync.yourdomain.com/fullchain.pem:/etc/nginx/ssl/server.crt:ro
     - /etc/letsencrypt/live/tasksync.yourdomain.com/privkey.pem:/etc/nginx/ssl/server.key:ro
   ```
3. Mở các dòng SSL Port 443 trong file `nginx/conf.d/tasksync.conf`.
4. Chạy `docker compose --env-file .env.production -f docker-compose.production.yml restart nginx`.

---

## 🔒 Mô hình Quyền Hạn Nginx (Privilege Model & Hardening)

Nginx container được gia cố an toàn theo chuẩn doanh nghiệp:
- **Master Process (PID 1):** Chạy dưới quyền `root` để thực hiện việc lắng nghe các cổng đặc quyền (`80` và `443`).
- **Worker Processes:** Tự động chuyển giao quyền sang user bị hạn chế `nginx` (unprivileged user) ngay sau khi khởi tạo master.
- **Container Hardening:**
  - `read_only: true`: Hệ thống tập tin container ở chế độ chỉ đọc, sử dụng các thư mục `/tmp` cho tệp tạm (`client_body_temp_path /tmp/client_temp`).
  - `security_opt: [no-new-privileges:true]`: Ngăn ngừa việc leo thang đặc quyền.
  - `cap_drop: [ALL]` & `cap_add: [NET_BIND_SERVICE, CHOWN, SETUID, SETGID]`: Chỉ cấp các capabilities thực sự cần thiết cho Nginx master process để chuyển giao quyền sang user `nginx`.

---

## ⚠️ Quy tắc Bảo mật Secrets & Kiểm thử Hợp lệ

> [!WARNING]
> **Cảnh báo Bảo mật Secrets:**
> 1. Không bao giờ chạy lệnh `docker compose config` không có `--quiet` nếu các biến môi trường chứa secret thật, để tránh làm lộ dữ liệu nhạy cảm ra terminal hoặc log.
> 2. Luôn dùng `docker compose --env-file .env.production -f docker-compose.production.yml config --quiet` để kiểm tra syntax mà không in secrets.
> 3. Không commit file `.env.production` chứa mật khẩu thật lên Git repository.
> 4. Không sao chép nội dung secrets thật vào các báo cáo audit hoặc tài liệu kỹ thuật.

---

## 🛠️ Hướng dẫn Vận hành & Validation Môi trường Production

### Khởi động Production Stack (Sử dụng File Env Bảo mật)
```powershell
# Kiểm tra cấu hình compose mà không làm lộ secrets
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet

# Khởi chạy toàn bộ stack dịch vụ
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

### Kiểm tra Trạng thái Containers
```powershell
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

### Kiểm tra Nginx Configuration Syntax
```powershell
docker exec tasksync-nginx-prod nginx -t
```

### Kiểm tra Health Check Endpoints (Đúng Phương Thức HTTP)
- **Nginx Gateway Health (`/healthz`):** Hỗ trợ phương thức `GET` (`curl.exe -i http://localhost/healthz`).
- **FastAPI Backend Health (`/health`):** Bắt buộc sử dụng phương thức `GET` (`curl.exe -i http://localhost/health`). Không dùng `-I` (HTTP `HEAD`) vì endpoint trả về `405 Method Not Allowed` đối với `HEAD`.
- **Frontend SPA & Docs (`/`, `/login`, `/docs`):** Hỗ trợ cả `GET` và `HEAD`.

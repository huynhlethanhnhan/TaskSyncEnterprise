# Hướng Dẫn Triển Khai & Đóng Gói (Deployment & Containerization Guide)

Tài liệu này hướng dẫn chi tiết cách đóng gói container hóa ứng dụng `TaskSyncEnterprise` bằng Docker và quy trình triển khai lên môi trường sản xuất (Production).

---

## 🔍 1. Tổng Quan (Overview) & Mục Đích (Purpose)

Đóng gói ứng dụng thông qua Docker giúp cách ly môi trường chạy độc lập, đồng nhất cấu hình chạy thử nghiệm và chạy thực tế, tránh lỗi phát sinh do sự khác biệt giữa các hệ điều hành vật lý.
* **Dockerfile đa tầng (Multi-Stage Build)**: Tách rời quá trình biên dịch (Build Stage) và quá trình vận hành (Run Stage) để tối ưu dung lượng ảnh (Image) và tăng tính bảo mật.
* **Docker Compose**: Điều phối các container phụ thuộc (FastAPI, Redis, SQL Server) hoạt động trên cùng một mạng ảo cục bộ.

---

## 🐋 2. Kiến Trúc Container (Docker Deployment Topology)

```mermaid
graph TD
    Client[Trình duyệt / Thiết bị khách] -->|Cổng 80/443| LB[Nginx Proxy / Load Balancer]
    LB -->|Cổng 8000| Backend[FastAPI App Container - Cổng 8000]
    Backend -->|Cổng 6379| Redis[Redis Caching Container - Cổng 6379]
    Backend -->|Cổng 1433| SQLServer[MS SQL Server Container - Cổng 1433]

    subgraph Mạng ảo Docker (tasksync-network)
        Backend
        Redis
        SQLServer
    end

    subgraph Lưu trữ dữ liệu vật lý (Volumes)
        Redis -->|Volume: redis_data| RedisVol[(Redis Disk)]
        SQLServer -->|Volume: mssql_data| SQLVol[(SQL Server Disk)]
    end
```

---

## ⚙️ 3. Tệp Tin Cấu Hình & Kiểm Tra Sức Khỏe (SRE Probes)

### Dockerfile Tối Ưu Hóa ([Dockerfile](file:///e:/TaskSyncEnterprise/backend/Dockerfile))
Dockerfile chia làm 2 giai đoạn:
1. `builder`: Cài đặt các công cụ biên dịch (`build-essential`) để biên dịch thư viện Python.
2. `runner`: Sử dụng ảnh Python siêu nhẹ `python:3.12-slim`, chỉ copy các gói thư viện đã biên dịch hoàn chỉnh để chạy ứng dụng, loại bỏ toàn bộ mã rác biên dịch.
3. Tích hợp sẵn chốt chặn kiểm tra sức khỏe của Container (SRE Probe):
   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
     CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')" || exit 1
   ```

### Docker Compose ([docker-compose.yml](file:///e:/TaskSyncEnterprise/docker-compose.yml))
Khởi động cụm 3 container. Sử dụng thuộc tính `condition: service_healthy` để đảm bảo cơ sở dữ liệu và Redis đã sẵn sàng tiếp nhận kết nối trước khi khởi chạy Backend.

---

## 📋 4. Danh Sách Kiểm Tra Triển Khai (Production Checklist)

Trước khi kích hoạt chạy thực tế, quản trị viên DevOps cần đảm bảo các chốt chặn sau:
1. **Bảo Mật Khóa**: Thay đổi `SECRET_KEY` sang chuỗi ngẫu nhiên có độ dài tối thiểu 256-bit.
2. **Cách Ly Trạng Thái**: Đặt biến `ENVIRONMENT=production` và tắt chế độ gỡ lỗi `SQL_ECHO=False`.
3. **Giới Hạn Tốc Độ**: Đảm bảo `RATE_LIMIT_ENABLED=True` để ngăn chặn tấn công DoS.
4. **Mạng Cục Bộ**: Chỉ ánh xạ cổng 8000 của Backend ra ngoài; giấu cổng 6379 (Redis) và 1433 (SQL Server) vào trong mạng ảo để tránh rò rỉ dữ liệu.

---

## 🧪 5. Khởi Động & Khắc Phục Sự Cố (Troubleshooting)

### Các Lệnh Triển Khai Nhanh
```bash
# 1. Build và khởi chạy các container dưới nền
docker-compose up -d --build

# 2. Xem log hoạt động thời gian thực
docker-compose logs -f backend

# 3. Thực thi nâng cấp cơ sở dữ liệu (migration)
docker exec tasksync-backend alembic upgrade head
```

### Khắc Phục Sự Cố (Troubleshooting)
> [!WARNING]
> **Container Backend bị crash liên tục khởi động lại**:
> * *Nguyên nhân*: Cơ sở dữ liệu SQL Server khởi động chậm hoặc sai mật khẩu SA, khiến Backend kiểm tra kết nối thất bại ở giai đoạn boot.
> * *Khắc phục*: Kiểm tra log của SQL Server (`docker logs tasksync-sqlserver`) hoặc tăng thời gian chờ `start_period` trong healthcheck của Docker Compose.

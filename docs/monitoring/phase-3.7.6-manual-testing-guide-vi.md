# Hướng Dẫn Kiểm Thử Thủ Công Phase 3.7.6: Tích Hợp Grafana & Giám Sát Chỉ Số

Tài liệu này cung cấp danh sách kiểm thử chi tiết và các câu lệnh PowerShell tương ứng để xác minh toàn bộ stack giám sát hoạt động chính xác sau Phase 3.7.6.

---

> [!WARNING]
> **CẢNH BÁO DỮ LIỆU**: Các lệnh dọn dẹp trong hướng dẫn này được thiết kế để bảo vệ dữ liệu database. Không thêm cờ `-v` vào các lệnh `docker compose down` thông thường để tránh làm mất cơ sở dữ liệu và lịch sử metric. Các lệnh phá hủy dữ liệu (destructive reset) được đánh dấu rõ ràng.

---

## Quy Trình Các Bước Thực Hiện

### Bước 1: Dọn dẹp các container lỗi thời (nếu có)
Trước khi chạy stack mới, kiểm tra các container cũ chạy trùng cổng:
```powershell
# Xem danh sách các container đang chạy
docker ps -a

# Chỉ dừng và xóa container lỗi thời liên quan đến TaskSync nếu chúng đang bị kẹt
# Lệnh down thông thường KHÔNG xóa named volumes
docker compose -f docker-compose.yml down
docker compose -f docker-compose.monitoring.yml down
```

### Bước 2: Khởi động các dịch vụ theo thứ tự phụ thuộc
1. Khởi động hạ tầng database và redis trước:
   ```powershell
   docker compose -f docker-compose.yml up -d sqlserver redis
   ```
2. Chờ 10 giây cho database sẵn sàng, khởi động tiếp FastAPI backend:
   ```powershell
   docker compose -f docker-compose.yml up -d backend
   ```
3. Khởi động stack giám sát (Prometheus và Grafana):
   ```powershell
   docker compose -f docker-compose.monitoring.yml up -d
   ```

### Bước 3: Kiểm tra trạng thái và sức khỏe của các Container
Kiểm tra xem toàn bộ các container đã khởi động thành công và ở trạng thái healthy chưa:
```powershell
# Kiểm tra danh sách container của ứng dụng
docker compose -f docker-compose.yml ps

# Kiểm tra danh sách container của stack giám sát
docker compose -f docker-compose.monitoring.yml ps
```
*Yêu cầu*: Cả 5 container (`tasksync-backend`, `tasksync-redis`, `tasksync-sqlserver`, `tasksync-prometheus`, `tasksync-grafana`) đều phải báo trạng thái `healthy` hoặc `running`.

### Bước 4: Kiểm tra log của Grafana và Prometheus để phát hiện lỗi khởi động
```powershell
# Xem log của Grafana
docker compose -f docker-compose.monitoring.yml logs --tail 100 grafana

# Xem log của Prometheus
docker compose -f docker-compose.monitoring.yml logs --tail 100 prometheus
```
*Yêu cầu*: Log Grafana không được chứa lỗi `Connection refused` hoặc cấu hình provisioning thất bại. Log Prometheus không được chứa lỗi cú pháp cấu hình.

### Bước 5: Xác minh endpoint metrics của Backend hoạt động từ máy Host
Sử dụng PowerShell để gọi thử endpoint `/metrics` của backend:
```powershell
$metrics = Invoke-WebRequest -Uri "http://localhost:8000/metrics" -TimeoutSec 10
$metrics.StatusCode
# Xem thử 10 dòng đầu của payload trả về
$metrics.Content.Split("`n")[0..10]
```
*Yêu cầu*: Trả về mã HTTP `200` và định dạng text Prometheus chứa các dòng `# HELP` và `# TYPE`.

### Bước 6: Kiểm tra Prometheus Targets
Truy cập địa chỉ sau trên trình duyệt máy host:
- [http://localhost:9090/targets](http://localhost:9090/targets)

*Yêu cầu*: Target `tasksync-backend` phải ở trạng thái **UP** (màu xanh lá).

### Bước 7: Đăng nhập vào Grafana và kiểm tra cấu hình tự động
1. Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000)
2. Đăng nhập với tài khoản mặc định:
   - **Username**: `admin`
   - **Password**: `admin`
   - *(Bỏ qua bước yêu cầu đổi mật khẩu bằng cách chọn "Skip" hoặc đặt mật khẩu mới của bạn)*
3. Xác minh Datasource Prometheus:
   - Truy cập **Connections** -> **Data sources**.
   - Click chọn **Prometheus**.
   - Cuộn xuống dưới cùng chọn **Save & test**.
   - *Yêu cầu*: Nhận được thông báo màu xanh báo kết nối thành công.
4. Xác minh Dashboard tự động hiển thị:
   - Truy cập mục **Dashboards**.
   - Mở thư mục **TaskSyncEnterprise** -> mở dashboard **TaskSyncEnterprise Backend Overview**.
   - *Yêu cầu*: Dashboard hiển thị đầy đủ các panels và không bị lỗi cú pháp truy vấn.

### Bước 8: Tạo traffic giả lập và xác minh các Panel cập nhật dữ liệu
Gửi một vài request tới backend để sinh metric dữ liệu:
```powershell
# Gửi liên tục 10 request tới endpoint health check
for ($i=1; $i -le 10; $i++) {
    Invoke-RestMethod -Uri "http://localhost:8000/health"
    Start-Sleep -Milliseconds 200
}
```
*Yêu cầu*: Chờ khoảng 15-30 giây (cadence của Prometheus scrape) rồi kiểm tra đồ thị `Request Rate` và `Requests by Path` trên Grafana. Các đồ thị này phải bắt đầu vẽ đường đi lên lớn hơn 0.

### Bước 9: Kích hoạt lỗi 404 để kiểm thử panel Error Rate
Gửi request tới một đường dẫn không tồn tại để ép sinh mã lỗi HTTP 404:
```powershell
try {
    Invoke-WebRequest -Uri "http://localhost:8000/api/v1/non-existent-endpoint"
} catch {
    $_.Exception.Response.StatusCode
}
```
*Yêu cầu*: Trên Grafana, kiểm tra panel `Error Rate vs Percentage` và `Error Breakdown`. Đồ thị sẽ hiển thị có lỗi HTTP xuất hiện tương ứng với path `/api/v1/non-existent-endpoint`.

### Bước 10: Xác minh độ bền vững khi khởi động lại (Persistence Test)

#### A. Khởi động lại Grafana
```powershell
# Khởi động lại container Grafana
docker compose -f docker-compose.monitoring.yml restart grafana
```
*Yêu cầu*: Sau khi container khởi động lại, truy cập lại `http://localhost:3000`. Bạn vẫn đăng nhập được bình thường bằng mật khẩu bạn đã thiết lập (không bị mất cơ sở dữ liệu user) và các dashboard provisioned vẫn hiển thị đúng.

#### B. Khởi động lại Prometheus và Reconnect
```powershell
# Khởi động lại container Prometheus
docker compose -f docker-compose.monitoring.yml restart prometheus
```
*Yêu cầu*: Grafana tự động phục hồi kết nối tới Prometheus sau khi dịch vụ online trở lại (Save & test hoạt động bình thường, dữ liệu lịch sử trên dashboard không bị mất nhờ named volume `tasksync-prometheus-data`).

#### C. Dừng Backend (Giả lập Backend sập)
```powershell
# Dừng container backend ứng dụng
docker compose -f docker-compose.yml stop backend
```
Kiểm tra Grafana dashboard:
*Yêu cầu*: Sau khoảng 15-30 giây, panel `Backend Target Status` phải chuyển sang màu đỏ báo **DOWN** và đồ thị `Request Rate` sẽ rơi về 0.

#### D. Khôi phục Backend
```powershell
# Khởi động lại backend
docker compose -f docker-compose.yml start backend
```
Kiểm tra Grafana dashboard:
*Yêu cầu*: Panel `Backend Target Status` tự động chuyển lại thành màu xanh chữ **UP** sau khi backend online trở lại.

---

## Các Lệnh Dọn Dẹp Cuối Cùng (Cleanup commands)

Khi kết thúc toàn bộ quá trình kiểm thử, nếu bạn muốn tắt hệ thống một cách an toàn mà không mất dữ liệu lịch sử:
```powershell
# Tắt stack monitoring
docker compose -f docker-compose.monitoring.yml down

# Tắt stack ứng dụng chính
docker compose -f docker-compose.yml down
```

> [!CAUTION]
> **LỆNH PHÁ HỦY DỮ LIỆU Metric (Chỉ dùng khi cần reset sạch hệ thống)**:
> Chạy lệnh này sẽ xóa sạch named volume chứa toàn bộ lịch sử Prometheus metric và cấu hình database Grafana:
> ```powershell
> docker compose -f docker-compose.monitoring.yml down -v
> ```

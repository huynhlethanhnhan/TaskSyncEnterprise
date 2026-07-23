# Hướng Dẫn Kỹ Thuật Phase 3.7.6: Tích Hợp Grafana & Giám Sát Trực Quan Hóa (Monitoring Visualization)

Tài liệu này cung cấp hướng dẫn chi tiết về cách thiết lập, vận hành và tìm hiểu cơ chế hoạt động của hệ thống giám sát sử dụng Grafana kết hợp Prometheus trong dự án **TaskSyncEnterprise**.

---

## 1. Grafana là gì?
Grafana là một nền tảng mã nguồn mở chuyên dụng dùng để trực quan hóa dữ liệu (visualization) và phân tích các chỉ số (metrics) thu thập được từ nhiều nguồn khác nhau (data sources). 

Grafana cho phép bạn xây dựng các bảng điều khiển (dashboards) động với giao diện trực quan, chuyên nghiệp, hỗ trợ nhiều loại panel như đồ thị đường (Timeseries), chỉ số tổng quan (Stat), biểu đồ phân bố cột (Bar Gauge), và biểu đồ tròn (Pie Chart).

## 2. Grafana khác Prometheus như thế nào?
Prometheus và Grafana là hai thành phần bổ trợ cho nhau tạo nên một stack giám sát (monitoring stack) tiêu chuẩn:

| Tiêu chí | Prometheus | Grafana |
|---|---|---|
| **Vai trò chính** | Thu thập (scraping), lưu trữ (storage) và truy vấn dữ liệu dạng thời gian (TSDB). | Truy vấn (querying), hiển thị trực quan (visualization) dữ liệu từ TSDB. |
| **Giao diện** | Đơn giản, dùng chủ yếu để debug, kiểm tra target hoặc chạy thử các câu PromQL thô. | Giao diện đồ họa (GUI) cao cấp, quản lý bảng điều khiển động, phân quyền và hiển thị trực quan. |
| **Cảnh báo (Alert)** | Tạo alert rules thô dựa trên PromQL và gửi cho Alertmanager. | Tạo alert trực quan trên giao diện và tích hợp trực tiếp với Slack, Email, Discord, Webhook... |

## 3. Prometheus Datasource là gì?
Trong Grafana, **Datasource** (Nguồn dữ liệu) là định nghĩa kết nối giúp Grafana biết nơi truy vấn dữ liệu. 
Đối với Prometheus, datasource chứa các thông tin:
- Địa chỉ HTTP của Prometheus server.
- Phương thức kết nối (HTTP GET hoặc POST).
- Cấu hình Authentication (nếu có).
- Tham số truy vấn (Scrape interval, timeout).

## 4. Tại sao Grafana trong Docker không được dùng `localhost:9090`?
Khi chạy trong Docker Compose:
- `localhost` (hoặc `127.0.0.1`) bên trong container Grafana sẽ trỏ về **chính container Grafana**, chứ không phải máy host hoặc container Prometheus.
- Để kết nối các container với nhau, ta sử dụng **Docker Network** (trong dự án này là `tasksync-observability`).
- Docker Compose tự động phân giải tên dịch vụ thành địa chỉ IP nội bộ của container đó. Do đó, địa chỉ kết nối chính xác từ Grafana sang Prometheus là:
  ```text
  http://prometheus:9090
  ```
  *(trong đó `prometheus` là tên service được định nghĩa trong `docker-compose.monitoring.yml`)*

## 5. Dashboard Provisioning & Infrastructure as Code (IaC)
Thay vì tạo datasource và dashboards thủ công trên giao diện web của Grafana (gây khó khăn cho việc đồng bộ giữa các môi trường và dễ mất dữ liệu khi container bị xóa), dự án áp dụng nguyên lý **Infrastructure as Code (IaC)** thông qua tính năng **Provisioning** của Grafana:
- Các cấu hình datasource được định nghĩa trong file YAML (`provisioning/datasources/prometheus.yml`).
- Các cấu hình load dashboard được định nghĩa trong file YAML (`provisioning/dashboards/dashboards.yml`).
- Các cấu trúc dashboard thực tế được xuất ra file JSON (`dashboards/tasksync-backend.json`).
Khi Grafana khởi động, nó tự động quét và áp dụng toàn bộ các thiết lập này từ đĩa cứng.

## 6. Dashboard JSON được lưu và Version Control như thế nào?
- Toàn bộ cấu trúc bảng điều khiển được mô tả bằng một file JSON lớn chứa thông tin về: tên panel, grid vị trí, câu truy vấn PromQL, định dạng hiển thị, đơn vị đo (unit).
- File JSON này được lưu trữ trong thư mục `monitoring/grafana/dashboards/` và được Git quản lý.
- Khi có sự thay đổi, bạn có thể thực hiện chỉnh sửa trực tiếp trên giao diện Grafana, xuất (export) JSON và ghi đè vào file Git này để lưu lại lịch sử thay đổi.

---

## 7. PromQL Cơ Bản & Các Loại Metrics

Prometheus sử dụng ngôn ngữ truy vấn **PromQL (Prometheus Query Language)**. Dữ liệu metric được chia làm 4 loại cơ bản:

### A. Các loại Metric chính
1. **Counter**: Chỉ số chỉ tăng (hoặc reset về 0 khi restart ứng dụng). Ví dụ: `http_requests_total`.
2. **Gauge**: Chỉ số biến động tăng giảm tự do. Ví dụ: `process_resident_memory_bytes`, `system_cpu_usage_ratio`.
3. **Histogram**: Phân bố tần suất dữ liệu vào các nhóm (buckets). Có 3 metric con đi kèm:
   - `[metric_name]_bucket{le="[upper_limit]"}`: Số lượng mẫu nhỏ hơn hoặc bằng giới hạn.
   - `[metric_name]_sum`: Tổng giá trị của toàn bộ mẫu.
   - `[metric_name]_count`: Tổng số lượng mẫu đã đo.
4. **Summary**: Tương tự Histogram nhưng tính toán quantile trực tiếp từ phía ứng dụng (ít được khuyến nghị hơn Histogram trong môi trường phân tán).

### B. So sánh `rate()` và `increase()`
- `rate(metric[range])`: Tính tốc độ tăng trung bình **mỗi giây** của Counter trong khoảng thời gian `range`.
  - Công thức: `increase(metric[range]) / giây`.
- `increase(metric[range])`: Tính tổng lượng tăng **thực tế** của Counter trong khoảng thời gian `range`.
- **Lưu ý**: Cả hai hàm đều tự động xử lý khi Counter bị reset về 0 do ứng dụng khởi động lại.

### C. Công thức PromQL thực tế dùng trong Dashboard

#### 1. Tính Request Rate (Tần suất yêu cầu HTTP mỗi giây)
```promql
sum(rate(http_requests_total{job="tasksync-backend"}[5m]))
```

#### 2. Tính HTTP Error Rate & Error Percentage (Tần suất và tỷ lệ lỗi HTTP)
- Tốc độ lỗi HTTP (lỗi 4xx và 5xx):
  ```promql
  sum(rate(http_requests_total{job="tasksync-backend", status_code=~"[45].."}[5m]))
  ```
- Tỷ lệ phần trăm lỗi trên tổng số requests:
  ```promql
  (sum(rate(http_requests_total{job="tasksync-backend", status_code=~"[45].."}[5m])) / sum(rate(http_requests_total{job="tasksync-backend"}[5m]))) * 100
  ```

#### 3. Tính Latency P95/P99 từ Histogram
Sử dụng hàm `histogram_quantile` trên bucket metric:
- Tính P95 latency (95% số request có thời gian xử lý nhỏ hơn giá trị này):
  ```promql
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="tasksync-backend"}[5m])) by (le))
  ```
- Tính P99 latency:
  ```promql
  histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="tasksync-backend"}[5m])) by (le))
  ```

#### 4. Đọc CPU và Memory Process Metrics
- CPU của tiến trình backend (dạng phần trăm):
  ```promql
  rate(process_cpu_seconds_total{job="tasksync-backend"}[5m]) * 100
  ```
- Bộ nhớ RAM tiến trình backend đang chiếm dụng (RSS):
  ```promql
  process_resident_memory_bytes{job="tasksync-backend"}
  ```

---

## 8. Hướng Dẫn Debug Lỗi Thường Gặp

### A. Cách phát hiện Backend bị DOWN
Khi backend dừng hoạt động đột ngột:
- Metric `up{job="tasksync-backend"}` sẽ trả về giá trị `0` (bình thường là `1`).
- Đồ thị `Backend Target Status` trên Dashboard sẽ chuyển sang màu đỏ chữ **DOWN**.

### B. Cách sửa Panel bị "No data"
Nếu panel hiển thị "No data", kiểm tra theo trình tự:
1. Có traffic thực tế gửi tới backend chưa? (Nếu không có request nào, các metric counter như `http_requests_total` sẽ không được Prometheus lưu vết).
2. Tên metric trong câu PromQL có chính xác hoàn toàn với endpoint `/metrics` không?
3. Khoảng thời gian hiển thị (Time range) ở góc trên bên phải Grafana có quá ngắn không (hãy thử chuyển sang `Last 1 hour` hoặc `Last 15 minutes`).

### C. Cách kiểm tra Grafana Datasource
- Vào **Connections** -> **Data sources** trong Grafana.
- Chọn datasource **Prometheus**.
- Cuộn xuống dưới cùng bấm nút **Save & test**. Nếu hiện thông báo màu xanh "Successfully queried the Prometheus API.", kết nối mạng hoàn toàn bình thường.

### D. Cách kiểm tra Prometheus Targets
- Truy cập địa chỉ `http://localhost:9090/targets`.
- Tìm kiếm job `tasksync-backend`.
- Trạng thái cột **State** phải hiển thị màu xanh lá cây **UP**. Nếu báo đỏ **DOWN**, hãy đọc thông báo lỗi ở cột **Error** (ví dụ: `connection refused` có nghĩa backend chưa bật hoặc sai port).

### E. Lỗi Docker Networking thường gặp
- **Symptoms**: Grafana không kết nối được tới Prometheus và báo lỗi `Bad Gateway` hoặc `Connection Refused` khi Test Datasource.
- **Cause**: Hai container không cùng nằm trên một Docker network, hoặc cấu hình sai hostname.
- **Fix**: Đảm bảo cả hai service `prometheus` và `grafana` trong `docker-compose.monitoring.yml` đều định nghĩa:
  ```yaml
  networks:
    - observability
  ```

---

## 9. Cảnh Báo Bảo Mật Khi Dùng Grafana Cho Production
1. **Thay đổi Mật khẩu mặc định**: Không bao giờ giữ tài khoản mặc định `admin` / `admin`. Hãy thay đổi thông qua biến môi trường `GRAFANA_ADMIN_PASSWORD` chứa chuỗi ký tự ngẫu nhiên, độ dài tối thiểu 16 ký tự.
2. **Hạn chế Port Exposure**: Trên môi trường production, không nên publish trực tiếp port `3000` ra internet (`0.0.0.0:3000`). Chỉ cho phép bind localhost `127.0.0.1:3000:3000` và cấu hình qua một reverse proxy an toàn như Nginx, HAProxy hoặc AWS ALB tích hợp SSL/TLS và Authentication bổ sung.
3. **Tắt Anonymous Access**: Đảm bảo không cho phép truy cập nặc danh (anonymous) có quyền admin. Cấu hình mặc định trong dự án đã vô hiệu hóa đăng ký tài khoản tự do (`GF_USERS_ALLOW_SIGN_UP=false`).
4. **Quyền hạn file cấu hình (Mount Permissions)**: Đảm bảo các file YAML cấu hình provisioning và các file JSON dashboard được mount dạng chỉ đọc (`:ro`) để ngăn tiến trình bên trong container sửa đổi cấu hình gốc trên máy host.

---

## 10. Những Kiến Thức Đạt Được Sau Phase 3.7.6
Sau khi hoàn thành Phase 3.7.6, học viên sẽ nắm vững:
1. Nguyên lý vận hành của Grafana và cách nó kết nối trực quan hóa dữ liệu từ Prometheus.
2. Khái niệm Infrastructure as Code (IaC) áp dụng vào thiết lập hệ thống quan sát thông qua cơ chế Auto-Provisioning.
3. Cách sử dụng ngôn ngữ PromQL nâng cao để phân tích dữ liệu dạng thời gian (Rate, Increase, Quantile cho Histogram).
4. Các chỉ số đo lường hiệu năng quan trọng của tiến trình phần mềm (Uptime, CPU, RAM, FDs) và lưu lượng HTTP mạng.
5. Quy trình xử lý sự cố (troubleshooting) kết nối mạng Docker giữa các container ứng dụng.

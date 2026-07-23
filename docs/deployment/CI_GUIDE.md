# Hướng Dẫn Vận Hành GitHub Actions CI (CI Pipeline Operational Guide)

Tài liệu này hướng dẫn chi tiết cách vận hành, cấu trúc và cách tự kiểm thử (local testing) của hệ thống Tích hợp liên tục (CI) sử dụng GitHub Actions trong dự án `TaskSyncEnterprise`.

---

## 🎯 1. Mục tiêu (CI Objectives)

CI Pipeline được thiết lập nhằm bảo vệ branch `develop` và `master` khỏi các thay đổi gây vỡ code hoặc không đáp ứng tiêu chuẩn chất lượng. Pipeline thực hiện kiểm tra tự động trên cả hai tầng:
*   **Backend (Python FastAPI):** Kiểm tra tính hợp lệ về cú pháp và style (Ruff), định dạng code trên các file thay đổi (Black), chạy toàn bộ 180 unit/integration tests (Pytest), và xuất báo cáo độ bao phủ mã nguồn (Coverage report).
*   **Frontend (React Vite & TailwindCSS):** Kiểm tra cài đặt dependencies ổn định và thực hiện biên dịch môi trường production (`npm run build`).

---

## ⚙️ 2. Các Trigger chạy Workflow (Workflow Triggers)

Hệ thống CI tự động chạy trong các kịch bản sau:
1.  **Push:** Khi có hành động push trực tiếp lên branch `develop`.
2.  **Pull Request:** Khi một PR được mở nhắm mục tiêu (target) vào branch `develop` hoặc `master`.
3.  **Manual Trigger:** Hỗ trợ kích hoạt thủ công qua nút **Run workflow** (`workflow_dispatch`) trên giao diện GitHub Actions.

*Lưu ý:* Cơ chế **concurrency control** được bật để tự động hủy các luồng chạy cũ (redundant builds) trên cùng một branch hoặc PR khi có commit mới được đẩy lên.

---

## 🏗️ 3. Các Jobs trong Pipeline (Jobs & Steps)

Pipeline gồm hai job chạy song song nhằm tối ưu thời gian phản hồi:

### 1. Job: `Backend CI` (Chạy trên `ubuntu-latest`)
*   **Checkout repository:** Tải mã nguồn dự án, cấu hình `fetch-depth: 0` để so sánh và phát hiện các file sửa đổi.
*   **Setup Python:** Thiết lập Python phiên bản `3.12` và cấu hình tự động cache cho `pip` dựa trên `backend/requirements-dev.txt`.
*   **Install dependencies:** Nâng cấp pip và cài đặt toàn bộ dependencies sản xuất + phát triển.
*   **Ruff lint check:** Quét kiểm tra lỗi tĩnh trên toàn bộ thư mục `backend/` theo quy tắc định nghĩa ở `backend/pyproject.toml`.
*   **Black style check:** Quét kiểm tra định dạng code bằng Black. Để tránh việc xáo trộn/reformat toàn bộ mã nguồn cũ, bước này chỉ quét **các file Python có thay đổi** (`.py`) trong commit/PR hiện tại.
*   **Pytest:** Chạy bộ test suite với in-memory SQLite, xuất file báo cáo coverage dạng XML (`coverage.xml`).
*   **Upload artifacts:** Tải báo cáo độ bao phủ (`coverage.xml`) lên GitHub Artifacts phục vụ phân tích.

### 2. Job: `Frontend CI` (Chạy trên `ubuntu-latest`)
*   **Checkout repository:** Tải mã nguồn.
*   **Setup Node.js:** Thiết lập môi trường Node.js `22` (LTS) và cache thư mục `npm`.
*   **Install dependencies:** Cài đặt package qua `npm ci` (clean install bảo mật và nhất quán).
*   **Verify production build:** Thực thi `npm run build` để kiểm tra khả năng biên dịch sản phẩm đầu ra thành công.

---

## 💻 4. Hướng Dẫn Tự Kiểm Thử Cục Bộ (Local Validation)

Nhà phát triển được khuyến khích chạy các lệnh tương đương dưới đây trên máy cá nhân trước khi thực hiện commit/push.

### Kiểm tra Backend
Mở Terminal tại thư mục `backend/` và thực thi:

```bash
# 1. Kích hoạt môi trường ảo (ví dụ trên Windows)
.venv\Scripts\activate

# 2. Cài đặt các gói công cụ phát triển
pip install -r requirements-dev.txt

# 3. Chạy Ruff kiểm tra lỗi tĩnh
ruff check .

# 4. Chạy Black ở chế độ kiểm tra (chỉ file muốn kiểm tra, ví dụ app/config.py)
black --check app/config.py

# 5. Chạy unit tests và hiển thị độ bao phủ (coverage) trực tiếp trên terminal
$env:PYTHONPATH="."
pytest --cov=app --cov-report=term tests/
```

### Kiểm tra Frontend
Mở Terminal tại thư mục `frontend/` và thực thi:

```bash
# 1. Cài đặt các gói dependencies
npm install

# 2. Chạy biên dịch thử nghiệm môi trường production
npm run build
```

---

## 🛠️ 5. Xử Lý Các Lỗi CI Thường Gặp (Troubleshooting)

### 1. Lỗi Ruff Check thất bại (Ruff Error)
*   **Triệu chứng:** Bước `Run Ruff check` báo lỗi đỏ và liệt kê các dòng code vi phạm.
*   **Nguyên nhân:** Mã nguồn mới viết có chứa import thừa, biến khai báo không sử dụng, hoặc so sánh không chuẩn.
*   **Khắc phục:** Chạy `ruff check . --fix` cục bộ trên máy để tự động sửa các lỗi cơ bản, hoặc sửa thủ công các lỗi logic được báo cáo.

### 2. Lỗi Black Check thất bại (Black Error)
*   **Triệu chứng:** Bước `Run Black check` báo lỗi "would reformat <filename>".
*   **Nguyên nhân:** File Python bạn vừa chỉnh sửa chưa được định dạng đúng chuẩn PEP 8 (88 ký tự một dòng, thụt lề, dấu phẩy cuối...).
*   **Khắc phục:** Chạy `black <filename>` cục bộ đối với file bị báo lỗi để Black định dạng lại tự động trước khi commit lại.

### 3. Lỗi ModuleNotFoundError: No module named 'app'
*   **Triệu chứng:** Pytest báo lỗi không nhận diện được module `app`.
*   **Nguyên nhân:** Chưa cấu hình biến môi trường `PYTHONPATH` trỏ tới thư mục `backend/` chứa package `app`.
*   **Khắc phục:** Đảm bảo thêm `PYTHONPATH=.` hoặc `$env:PYTHONPATH="."` khi chạy lệnh pytest cục bộ. Trong CI, việc này đã được xử lý qua cài đặt `env.PYTHONPATH` trực tiếp trong file yaml.

---

## 🛡️ 6. Khuyến Nghị Thiết Lập Bảo Vệ Nhánh (Branch Protection Recommendations)

Để đảm bảo quy trình CI hoạt động như một chốt chặn bảo mật tin cậy, Admin/Owner repository nên cấu hình các luật bảo vệ nhánh (`Branch Protection Rules`) trên GitHub đối với nhánh `develop`:

1.  **Require a pull request before merging:** Yêu cầu tất cả code vào `develop` phải đi qua Pull Request.
2.  **Require status checks to pass before merging:** Tích hợp bắt buộc các status checks sau phải thành công:
    *   `Backend CI (Python 3.12)`
    *   `Frontend CI (Node 22)`
3.  **Require conversation resolution before merging:** Yêu cầu toàn bộ các nhận xét và thảo luận trên PR phải được giải quyết (resolved) trước khi merge.

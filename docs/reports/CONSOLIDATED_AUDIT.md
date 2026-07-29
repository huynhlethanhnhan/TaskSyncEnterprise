# Báo cáo audit tổng hợp

Ngày cập nhật: 2026-07-29  
Nhánh: `develop`

## Phạm vi

Backend, frontend, dependency, dead code, realtime, tài liệu, Docker Compose, SQL Server và quy trình nhánh.

## Kết quả

### Code

- Xóa 16 file frontend cũ/không có entrypoint.
- Xóa dependency không dùng: `jwt-decode`, `react-dropzone`, `react-hot-toast`, `react-hook-form`.
- Xóa hook/helper/export không có caller.
- Ruff sửa import `status` bị shadow và các import backend không dùng.
- Vulture không còn finding confidence cao ngoài callback framework đã được đặt tên `_executemany`.
- Không có log, cache, build output hoặc OS junk được Git theo dõi.

### Realtime và workflow

- Domain event đã bao phủ Task, Employee, Project, Sprint, Backlog, Team, Department, Topic, Feedback, File và Vacation.
- Hai browser context nhận cập nhật Task không cần F5.
- Calendar/Vacation nghe domain event dù đang dùng state tải trực tiếp.

### Runtime

- Backend test: 331 passed sau dead-code cleanup.
- Frontend lint, typecheck, 22 unit/contract test và production build đều đạt sau cleanup.
- SQL Server native reachable và database health `UP`.
- Redis local đang `DOWN`, vì vậy readiness trả `503`.
- Docker CLI/Compose có sẵn nhưng Docker Desktop engine chưa chạy.

### Security dependency

- React Router `7.18.2` là bản v7 mới nhất cài được trong registry tại thời điểm audit. `npm audit` còn cảnh báo RSC CSRF; ứng dụng dùng declarative SPA, không dùng unstable RSC APIs. [GitHub Advisory GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) nêu bản vá v8.3.0 nhưng registry chưa cung cấp khi kiểm tra.
- `pip-audit` còn cảnh báo `ecdsa 0.19.2` (`PYSEC-2026-1325`) và không nêu fix version. Đây là dependency bắc cầu của JWT stack; cần theo dõi và thay thư viện JWT nếu upstream không vá.

Hai cảnh báo trên là residual risk đã ghi nhận, không được mô tả là “zero vulnerability”.

## Tài liệu

- Xóa báo cáo phase, ảnh evidence và cây learning lặp.
- Hợp nhất thành kiến trúc, domain, development, Docker/database, seed, learning, audit và roadmap.
- `master` chỉ nên giữ README giới thiệu/cài đặt; bộ docs kỹ thuật ở `develop`.

## Trạng thái

Chưa kết luận production-ready cho đến khi:

1. Docker engine chạy và toàn stack đạt health.
2. Dependency advisories có bản vá khả dụng hoặc được thay thế.
3. Production environment điền đủ biến bắt buộc.
4. Backup/restore được diễn tập lại trên dữ liệu không quan trọng.

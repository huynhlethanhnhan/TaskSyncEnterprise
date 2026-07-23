# Kiểm toán Git ban đầu — Phase 4 Final Closure

**Thời điểm:** 2026-07-22 (Asia/Saigon)  
**Nhánh:** `develop`  
**HEAD:** `8563d6bc7ad09fe10abfede69cd9cfff32a15595`

## Trạng thái ban đầu

| Hạng mục | Kết quả |
|---|---|
| Upstream | `develop...origin/develop` |
| Thay đổi đã stage | 0 |
| Tệp tracked có thay đổi chưa stage | 46 |
| Tệp untracked | 250 |
| Diff tracked | 2,270 dòng thêm, 2,311 dòng xóa trên 46 tệp |
| Git object store | 8.11 MiB loose + 1.35 MiB pack; 80.79 KiB garbage |
| Trạng thái | Dirty; không đủ an toàn để switch branch, merge hoặc tạo commit cô lập |

Hai tệp `DB_V2.sql` và `DB_V2_utf8.sql` đang ở trạng thái deleted trong working tree. Đây là thay đổi có sẵn của người dùng; audit không khôi phục, xóa hoặc stage chúng.

## Phát hiện kích thước và generated content

- Hai tệp log tracked lớn nhất là `backend/logs/app.log.1` và `backend/logs/application.log.1`, mỗi tệp khoảng 10 MiB. `.gitignore` đã bỏ qua `*.log`, nhưng quy tắc không tác động ngược lên tệp đã tracked.
- Local generated directories tồn tại: `frontend/node_modules`, `frontend/dist`, các thư mục `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, và backend virtual environment.
- `docs/image/` có 13 tệp; `docs/reference_images/` và thư mục con có 20 tệp tham chiếu. Chúng đang untracked và phải được loại trừ khỏi Git theo chính sách closure.
- Runtime evidence hợp lệ nằm dưới `docs/evidence/phase-4/` và không được gộp với demo/reference images.

## Alembic

`backend/alembic/`, `env.py`, `script.py.mako`, và lịch sử migration được giữ nguyên. Có cache Python cục bộ trong Alembic nhưng không có bằng chứng cho phép xóa hoặc sửa migration đã áp dụng. Migration Unicode `7b31f6e4c2a0_make_business_text_unicode.py` đang untracked nhưng database hiện tại báo revision này là head; vì vậy đây là tệp release-critical, không phải rác.

## Kiểm tra ignore/build context

- Frontend Docker context loại trừ `node_modules`, `dist`, `.git`, `.github`, và log.
- Backend Docker context loại trừ virtualenv, cache, logs, uploads, database cục bộ, và tài liệu.
- `.env.production` tồn tại cục bộ và bị ignore; giá trị secret không được ghi vào evidence.
- Development và production Compose config đều parse thành công trong kiểm tra ban đầu.

## Quyết định an toàn

Audit sẽ không chạy `git reset`, `git clean`, force checkout/push, xóa volume, hoặc xóa file người dùng. Việc stage/commit/switch/merge bị hoãn cho đến khi các gate runtime hoàn tất và một tập thay đổi cô lập có thể được chứng minh. Các tệp log tracked lớn sẽ được báo cáo để untrack trong một commit cleanup riêng; không thay đổi index trong working tree dirty hiện tại.

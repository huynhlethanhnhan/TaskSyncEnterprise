# CODEX FINAL RELEASE AUDIT

## Phạm vi

- Repository: `E:\TaskSyncEnterprise`
- Branch: `develop`
- Baseline: `b8ba463479f364aaace95afb07dfc4377a688ced`
- Ngày audit: 2026-08-03
- Môi trường: Windows, Python 3.12, Node.js 24, MSSQL local, không dùng Docker

## Kết luận

Các lỗi phát hiện trong audit độc lập đã được sửa và có regression tests. Toàn bộ
quality gate local, MSSQL migration và browser acceptance đều PASS. Trạng thái
`READY FOR MASTER` chỉ có hiệu lực khi GitHub Actions của commit audit sau khi
push cũng hoàn tất với kết quả `success`.

## Issues, Root Cause và Fix

### 1. Manager không thể đổi Team Leader

- **Issue:** UI hiển thị thao tác đổi Team Leader cho Admin và Manager, nhưng API
  `PUT /teams/{id}` chỉ chấp nhận Admin nên Manager luôn nhận 403.
- **Root cause:** Backend dùng `RequireAdmin` cho toàn bộ endpoint update team.
- **Fix:** Dùng `RequireManager`; Manager chỉ được thay đổi `leader_id` và chỉ với
  team thuộc phòng ban của mình. Admin vẫn giữ toàn quyền update.
- **Evidence:** Regression tests xác nhận Manager đổi leader thành công, không thể
  đổi tên team, và Employee nhận 403.

### 2. Backlog đã chuyển Task vẫn mang trạng thái Backlog/In Sprint

- **Issue:** Item đã có `task_id` vẫn có thể hiển thị nút "Tạo Task" trong UI.
- **Root cause:** Luồng convert đặt lại status thành `Backlog` hoặc `In Sprint`;
  Task và liên kết Backlog được commit ở hai transaction riêng.
- **Fix:** Tạo Task, flush ID, liên kết item và đặt status `Converted` trong cùng
  một transaction.
- **Evidence:** Regression test đọc lại item và xác nhận `task_id` cùng status
  `Converted`.

### 3. Thiếu kiểm tra toàn vẹn Epic/Task trong Product Backlog

- **Issue:** API cho phép liên kết Epic thuộc project khác; payload update còn có
  thể gửi trực tiếp `task_id`.
- **Root cause:** Router chỉ kiểm tra Sprint mapping và schema update chấp nhận
  trường liên kết nội bộ.
- **Fix:** Xác thực Epic tồn tại, chưa xóa và cùng project; trả 404/409 đúng hợp
  đồng. Loại `task_id` khỏi update schema và cấm extra fields để trả 422.
- **Evidence:** Regression tests xác nhận Epic khác project trả 409 và client gán
  `task_id` trả 422, không bị chuyển thành 500.

### 4. Frontend contract tests và CI không phản ánh code hiện tại

- **Issue:** `npm test` fail 3 tests do còn đọc `.jsx` sau khi code chuyển sang
  `.tsx`, đồng thời assertion quyền Task không còn đúng. CI chỉ build frontend.
- **Root cause:** Contract tests và workflow chưa được cập nhật cùng refactor.
- **Fix:** Cập nhật đường dẫn/assertion; thêm ESLint, TypeScript và frontend unit
  tests vào CI Foundation và Release Pipeline.
- **Evidence:** `22/22` frontend tests PASS; lint, typecheck và build PASS.

### 5. Product Backlog bị cắt control ở desktop và mobile

- **Issue:** Dropdown Epic và nút xóa bị đẩy tới `left=-79.6px` trên viewport
  390px; desktop ép badge thành từng chữ theo cột.
- **Root cause:** Action row có intrinsic width lớn, `shrink-0`, trong card flex
  ngang với phần nội dung.
- **Fix:** Card dùng layout dọc ổn định; action row wrap theo breakpoint và mọi
  select có `min-w-0/max-w-full`.
- **Evidence:** Browser DOM audit tại 1440x900 và 390x844 đều có 0 control vượt
  viewport, không có horizontal document overflow; screenshot đã được chụp lại.

### 6. Menu tài khoản không có keyboard-accessible trigger

- **Issue:** Avatar mở menu được bọc bằng `div` click-only.
- **Root cause:** Navbar truyền trigger không có native button semantics.
- **Fix:** Đổi trigger thành button có `aria-label="Open account menu"`.
- **Evidence:** ESLint, TypeScript và production build PASS.

### 7. React Router có dependency advisory mức High

- **Issue:** `npm audit` phát hiện `react-router-dom 7.18.2` kéo theo advisory
  CSRF mức High. Downgrade 7.11.0 lại mở các advisory XSS/open redirect cũ.
- **Root cause:** Không còn phiên bản `react-router-dom` 7.x nào sạch theo npm
  advisory hiện tại; package core đã chuyển sang dòng 8.3 đã vá.
- **Fix:** Migration 23 import từ `react-router-dom` sang package hợp nhất
  `react-router 8.3.0`, cập nhật lockfile và loại dependency cũ.
- **Evidence:** `npm audit` trả `0 vulnerabilities`; lint, typecheck, 22 frontend
  tests, production build và Playwright acceptance 9/9 đều PASS sau migration.

## Automated Tests

| Gate | Kết quả | Evidence |
| --- | --- | --- |
| Backend Pytest | PASS | `416 passed in 250.42s` |
| Backend Ruff | PASS | `ruff check .` |
| Backend Black | PASS | các Python file đã thay đổi |
| Alembic heads/current | PASS | `05252bd1d012 (head)` |
| Alembic upgrade MSSQL | PASS | `alembic upgrade head` |
| Docker clean bootstrap | PASS | Backend/frontend image build, SQL Server/Redis healthy, HTTP 200 và Alembic `05252bd1d012 (head)` |
| Frontend ESLint | PASS | `npm run lint` |
| Frontend TypeScript | PASS | `npm run typecheck` |
| Frontend contracts | PASS | `23 passed, 0 failed` |
| Frontend production build | PASS | Vite 8 build thành công |
| Playwright acceptance | PASS | 9/9, console errors 0, unexpected network errors 0 |
| Bandit Medium/High | PASS | 0 issues; seed identifiers dùng allowlist tĩnh |
| pip-audit | PASS | 0 known vulnerabilities, 1 approved ignore |
| npm audit | PASS | 0 vulnerabilities |
| Git diff whitespace | PASS | `git diff --check` |

## Manual Simulation

Luồng đã kiểm tra bằng browser trên MSSQL local:

`Admin login -> Dashboard -> Department -> Department Detail -> Team -> Team Detail -> Project -> Sprint -> Epic/Topics -> Product Backlog -> Task -> Notification -> Logout`

- Login và protected API: PASS
- Các page tải đúng heading và dữ liệu: PASS
- Logout quay lại `/login`: PASS
- Console error: 0
- Unexpected network error trong acceptance: 0
- Không có HTTP 500, unhandled exception, unhandled promise hoặc React Error
  Boundary trong phiên nghiệm thu: PASS
- RBAC Admin/Manager/Team Leader/Employee: PASS qua backend API regression suite
  và browser manual test bằng các tài khoản seed thật.

### Role and organization follow-up (2026-08-03)

- **Admin:** System Settings hiển thị đầy đủ và tải cấu hình persistent từ
  `/settings/system`; Manager/Team Leader/Employee chỉ thấy My Settings.
- **Manager:** `manager.ops@tasksync.example.com` đổi trưởng nhóm OPS-T1 từ
  Phan Hoàng Long sang Trương Gia Linh thành công, giao diện cập nhật ngay.
- **Team Leader:** Trương Gia Linh sau khi được chỉ định có thể thêm/chuyển/gỡ
  nhân viên thường và thêm task trong dự án, nhưng không có quyền tự đổi trưởng
  nhóm hay sửa System Settings/Project Settings.
- **Employee:** `employee014@tasksync.example.com` không thấy nút Đổi/Thêm/
  Chuyển/Gỡ ở team, không thấy Project Settings hoặc Thêm công việc.
- **Data restoration:** Manager đã đổi trưởng nhóm OPS-T1 về Phan Hoàng Long sau
  kiểm thử, giữ nguyên trạng thái demo ban đầu.
- **Project navigation:** KPI dự án ở Department list/detail, nút dự án tại Team
  detail và dự án trong Employee detail đều dẫn đến Project list/detail. Bộ lọc
  `department_id`, `team_id`, `status` tính cả quan hệ Project Member nên khớp
  với KPI phòng ban dù project seed chưa gán trực tiếp tổ chức.
- **Logging test note:** Lần full-suite đầu có `413 passed` và một logging E2E
  failure do Uvicorn local ghi cùng file log. Test logging chạy riêng PASS; sau
  khi dừng Uvicorn, full suite chạy sạch `414 passed`. Backend đã được khởi động
  lại và `/health` trả `healthy`.
- **Master CI normalization:** Run master đầu tiên dừng ở Black vì phạm vi diff
  với master cũ bao gồm 36 file Python lịch sử. Black được áp dụng cơ học cho
  toàn backend; Ruff, Black check và full suite `414 passed` sau normalization.
- **Docker clean bootstrap (2026-08-03):** `scripts/docker_smoke_test.ps1` chạy
  trên project cô lập `tasksync-smoke`, tự tạo database mới, chạy Alembic tới
  `05252bd1d012 (head)`, xác nhận backend/frontend HTTP 200 và cleanup toàn bộ
  container, network, volume thử nghiệm. Full suite sau thay đổi đạt `416 passed`.

## Screenshots

Tất cả ảnh nằm trong `docs/testing/screenshots/codex/`:

- `01-login.png`
- `02-dashboard.png`
- `03-departments.png`
- `04-department-detail.png`
- `05-teams.png`
- `06-team-detail.png`
- `07-projects.png`
- `08-sprints.png`
- `09-epics.png`
- `10-backlog.png`
- `11-tasks.png`
- `12-notifications.png`
- `13-mobile-departments.png`
- `14-mobile-backlog.png`
- `15-mobile-tasks.png`

## GitHub Actions

- Baseline commit `b8ba463` / CI Foundation run `30821149181`: **PASS**.
- Commit audit sau khi push phải có CI Foundation `success` trước khi merge.
- Workflow đã được tăng cường để frontend lint, typecheck và contracts trở thành
  release gates thay vì chỉ chạy Vite build.

## Remaining Risks

- Vite cảnh báo main JS bundle khoảng 1.38 MB (gzip khoảng 378 KB). Đây là rủi ro
  hiệu năng cần xử lý bằng route-level code splitting, không phải functional
  blocker cho release hiện tại.
- Pytest local mất khoảng 7 phút 23 giây; CI timeout 10 phút có biên an toàn hạn
  chế khi chạy coverage trên runner chậm. Cần theo dõi thời lượng workflow.
- Seed destructive `--reset` không chạy trực tiếp trên database nghiệm thu để
  tránh xóa dữ liệu local. Seed plan, reset safety và dataset integrity được kiểm
  tra trong test suite cô lập.

## Recommendation

**READY FOR MASTER**, với điều kiện bắt buộc: GitHub Actions của commit audit sau
khi push phải hoàn tất `success`. Không merge tự động trong audit này.

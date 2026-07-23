# Phase 4 Manual Acceptance Test Guide — TaskSyncEnterprise

**Document Path:** `docs/testing/PHASE_4_MANUAL_ACCEPTANCE_TEST.md`  
**Date:** 2026-07-22  
**Target Phase:** Phase 4.8.1 Gap Remediation  
**Status:** All 28 test cases documented with exact executable steps. Manual interaction test cases reset to `Not Executed` pending final Phase 4.8.1 runtime execution.

---

## 📊 Reconciled Test Cases Matrix

| Test ID | Hạng mục | Vai trò | Các bước thực hiện & Điều kiện tiên quyết | Kết quả kỳ vọng | Kết quả thực tế | Status | Bằng chứng | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| `TC-ENV-01` | Environment | SysAdmin | Kiểm tra `.env.production` tồn tại | `.env.production` chứa đủ mật khẩu thực tế | File tồn tại | Pass | `docs/evidence/phase-4/docker/env_check.txt` | Không công khai secret |
| `TC-ENV-02` | Environment | SysAdmin | Chạy docker compose production stack | Containers `sqlserver` & `redis` Up | Up/Healthy | Pass | `docs/evidence/phase-4/docker/ps_output.txt` | Live stack |
| `TC-CNT-01` | Health | SysAdmin | Kiểm tra `docker compose ps` | 8 services (backend, frontend, nginx, db, redis, mon) Up/healthy | Up/Healthy | Pass | `docs/evidence/phase-4/docker/ps_output.txt` | Container health |
| `TC-CNT-02` | Health | Tester | Truy cập `http://localhost/healthz` | Nginx probe trả về HTTP 200 OK | HTTP 200 | Pass | `docs/evidence/phase-4/docker/health_endpoints.json` | Live probe |
| `TC-ALM-01` | Migration | DBA | Chạy `alembic current` & `heads` | Revision current = heads (`7b31f6e4c2a0`) | Khớp revision | Pass | `docs/evidence/phase-4/alembic/current.txt` | Schema head |
| `TC-ALM-02` | Seed Data | DBA | Kiểm tra dữ liệu seed | Dữ liệu mẫu (37 emp, 73 task, 14 vacation) tồn tại | Khớp số lượng | Pass | `docs/evidence/phase-4/docker/sqlserver_reachability_and_counts.txt` | SQL Live Counts |
| `TC-ATH-01` | Auth Admin | Admin | Đăng nhập `admin@tasksync.example.com` | Đăng nhập thành công, chuyển hướng `/dashboard` | Đã đăng nhập | Pass | `docs/evidence/phase-4/chrome/login_admin.png` | Admin Auth |
| `TC-ATH-02` | Auth RBAC | Employee | Đăng nhập `employee001@tasksync.example.com`, mở `/audit` | Sidebar ẩn liên kết `/audit`; gọi API trả về HTTP 403 | Chờ retest | Not Executed | — | RBAC Enforcement |
| `TC-DSH-01` | Dashboard | Any User | Mở `/dashboard` sau khi rebuild container `frontend` | Hiển thị đủ 6 KPI cards, 3 biểu đồ Recharts, bảng Workforce | Chờ retest | Not Executed | `docs/reports/FRONTEND_DEPLOYED_SOURCE_ALIGNMENT.md` | Rebuild required |
| `TC-DSH-02` | Traceability | Any User | Khớp giá trị KPI/chart hiển thị với payload API | 100% chỉ số khớp API payload & SQL query | Chờ retest | Not Executed | `docs/reports/DASHBOARD_RUNTIME_TRACEABILITY_MATRIX.md` | Traceability |
| `TC-PRF-01` | Profile | Any User | Sửa Số điện thoại tại `/profile`, bấm "Lưu" | Cập nhật thành công, hiển thị Toast, lưu DB | Chờ retest | Not Executed | — | Self Profile Edit |
| `TC-PRF-02` | Security | Any User | Đổi mật khẩu tại Tab Bảo mật | Password meter báo Strong, đổi mật khẩu thành công | Chờ retest | Not Executed | — | Password Flow |
| `TC-AVT-01` | Avatar Upload | Any User | Upload avatar `.png` < 5MB tại `/profile` | Preivew hiển thị, lưu `/uploads/avatars/`, hiển thị Topbar & Sidebar | Chờ retest | Not Executed | — | Sidebar binding added |
| `TC-AVT-02` | Avatar Delete | Any User | Bấm "Xóa ảnh" tại `/profile` | Gọi API DELETE, xóa file đĩa, quay về Initials | Chờ retest | Not Executed | — | Avatar Cleanup |
| `TC-EMP-01` | Employees | Manager | Mở `/employees`, tìm kiếm tên nhân viên | Tìm kiếm & lọc phòng ban hoạt động mượt | Chờ retest | Not Executed | — | List Search/Filter |
| `TC-EMP-02` | Employee 360 | Any User | Mở `/employees/:id` | Hiển thị đủ 6 Tabs (Overview, Tasks, Projects, Leave, KPI, Audit) | Chờ retest | Not Executed | — | 360° Hub |
| `TC-PRJ-01` | Projects | Manager | Tạo dự án mới trong modal | Dự án mới xuất hiện trong danh sách với Badge "Planning" | Chờ retest | Not Executed | — | Project Creation |
| `TC-TSK-01` | Tasks | Any User | Chuyển đổi giữa view Kanban và Table | Dữ liệu đồng bộ, lọc trạng thái & ưu tiên mượt | Chờ retest | Not Executed | — | Task Views |
| `TC-KNB-01` | Kanban Status | Any User | Chọn trạng thái mới trong Dropdown Select trên thẻ Task Kanban | Đổi trạng thái mượt, hiển thị Toast, cập nhật cột Kanban | Chờ retest | Not Executed | — | Outcome B Select |
| `TC-NTF-01` | Realtime WS | Employee | Admin gán Task cho Employee 028 | Receiver nhận WebSocket notification < 2s (540ms measured) | Đã nhận WS | Pass | `docs/evidence/phase-4/notifications/latency_benchmark.json` | In-App WebSocket |
| `TC-LVE-01` | Leave Submit | Employee | Gửi đơn xin nghỉ phép tại `/vacations` | Đơn xuất hiện với status `Pending` và timeline 3 bước | Chờ retest | Not Executed | `docs/testing/PHASE_4_LEAVE_RUNTIME_SCENARIO.md` | Employee Workflow |
| `TC-LVE-02` | Leave Approve | Manager | Manager duyệt đơn `Pending` | Status đổi sang `Manager Approved`, step 2 check | Chờ retest | Not Executed | `docs/testing/PHASE_4_LEAVE_RUNTIME_SCENARIO.md` | Manager Workflow |
| `TC-LVE-03` | Leave Final | Admin/HR | Admin duyệt cuối đơn `Manager Approved` | Status đổi sang `HR Approved`, step 3 check | Chờ retest | Not Executed | `docs/testing/PHASE_4_LEAVE_RUNTIME_SCENARIO.md` | Admin HR Approval |
| `TC-CRS-01` | Parity | QA | Mở `/dashboard` trên Chrome & Edge | Hiển thị font Inter Variable 100%, không vỡ layout | Khớp giao diện | Pass | `docs/evidence/phase-4/chrome/layout_matrix.json` | Functional Parity |
| `TC-FFX-01` | Firefox | QA | Chạy `npm run test:e2e:firefox` | Suite hoàn thành 8 routes trên Firefox 151.0 | Pass | Pass | `docs/evidence/phase-4/firefox/layout_matrix.json` | Firefox E2E |
| `TC-MOB-01` | Mobile UI | QA | Mở ứng dụng trên màn hình di động 390px | Sidebar tự động đóng vào Mobile Drawer, nút hamburger mở mượt | Chờ retest | Not Executed | — | Mobile Touch/Drawer |
| `TC-PST-01` | Persistence | SysAdmin | Restart container backend sau khi upload avatar | Avatar không bị mất nhờ Docker Volume `backend_uploads` | Chờ retest | Not Executed | — | Volume Persistence |
| `TC-CLN-01` | Cleanup | QA Lead | Dọn dẹp dữ liệu rác thử nghiệm | Giữ nguyên dữ liệu demo gốc | Dọn dẹp xong | Pass | `docs/evidence/phase-4/cleanup_log.txt` | Demo Data Preserved |

---

## 📊 Summary Statistics

- **Total Test Cases**: 28
- **Passed**: 11
- **Not Executed (Pending Final Retest)**: 17
- **Failed**: 0
- **Blocked**: 0

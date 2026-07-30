# Báo cáo kiểm tra chức năng quản lý thành viên phòng ban và team

**Ngày kiểm tra:** 2026-07-30

**Phạm vi:** TaskSyncEnterprise — chức năng thêm, gỡ và chuyển thành viên

**Nhánh triển khai:** `develop`, sau đó đồng bộ `master`

## 1. Yêu cầu đã xử lý

- Admin có thể thêm, gỡ và chuyển thành viên ở cấp phòng ban và team.
- Manager có thể quản lý nhân viên thuộc phòng ban mình quản lý.
- Team Leader có thể quản lý nhân viên thuộc team mình dẫn dắt.
- Manager và Team Leader không thể tự gỡ hoặc tự chuyển bản thân.
- Manager và Team Leader chỉ có thể thao tác tài khoản có vai trò Employee; không thể điều chuyển Admin hoặc Manager khác.
- Chuyển phòng ban tự động gỡ team cũ để tránh dữ liệu chéo phòng ban.
- Chuyển team chỉ được thực hiện giữa các team trong cùng phòng ban.
- Mọi kiểm tra quyền được thực hiện tại backend; việc ẩn nút trên giao diện chỉ là lớp hỗ trợ trải nghiệm.

## 2. Ma trận phân quyền đã xác nhận

| Thao tác | Admin | Manager | Team Leader |
|---|---:|---:|---:|
| Thêm nhân viên chưa có phòng ban vào phòng ban | Có | Có, tại phòng ban mình quản lý | Không |
| Gỡ nhân viên khỏi phòng ban | Có | Có, tại phòng ban mình quản lý | Không |
| Chuyển nhân viên sang phòng ban khác | Có | Có, từ phòng ban mình quản lý | Không |
| Thêm nhân viên cùng phòng ban và chưa có team vào team | Có | Có, trong phòng ban mình quản lý | Có, tại team mình dẫn dắt |
| Gỡ nhân viên khỏi team | Có | Có, trong phòng ban mình quản lý | Có, tại team mình dẫn dắt |
| Chuyển nhân viên sang team khác | Có | Có, trong cùng phòng ban | Có, từ team mình dẫn dắt và trong cùng phòng ban |
| Tự gỡ/tự chuyển bản thân | Có theo quyền Admin | Bị chặn | Bị chặn |
| Thao tác Admin/Manager khác | Có | Bị chặn | Bị chặn |

## 3. Thay đổi kỹ thuật

### Backend

- Thêm service nghiệp vụ `organization_membership.py`.
- Thêm schema request/response riêng cho chuyển phòng ban, chuyển team và danh sách đích hợp lệ.
- Bổ sung API:
  - `GET /api/v1/departments/{department_id}/member-candidates`
  - `GET /api/v1/departments/{department_id}/transfer-targets`
  - `POST/DELETE /api/v1/departments/{department_id}/members/{employee_id}`
  - `POST /api/v1/departments/{department_id}/members/{employee_id}/transfer`
  - `GET /api/v1/teams/{team_id}/member-candidates`
  - `GET /api/v1/teams/{team_id}/transfer-targets`
  - `POST/DELETE /api/v1/teams/{team_id}/members/{employee_id}`
  - `POST /api/v1/teams/{team_id}/members/{employee_id}/transfer`
- Cache nhân viên, phòng ban và team liên quan được vô hiệu hóa sau mỗi thay đổi.

### Frontend

- Trang chi tiết phòng ban có nút thêm, chuyển và gỡ thành viên.
- Trang chi tiết team có nút thêm, chuyển và gỡ thành viên.
- Danh sách ứng viên và nơi chuyển đến lấy từ API đã lọc theo quyền.
- Nút thao tác không hiển thị cho chính Manager/Team Leader hoặc cho tài khoản ngoài vai trò Employee.
- Có xác nhận trước thao tác gỡ và thông báo kết quả thành công/thất bại.

## 4. Kết quả kiểm thử

| Gate | Kết quả |
|---|---|
| Test phân quyền và workflow mục tiêu | **develop: 17 passed; master: 9 passed** |
| Toàn bộ backend test suite | **develop: 340 passed; master: 297 passed** |
| Backend coverage | **76% tổng thể; service mới 79%** |
| Ruff | **Passed** |
| Bandit mức Medium/High | **0 issue** |
| Frontend unit/contract tests | **22 passed** |
| TypeScript `tsc --noEmit` | **Passed** |
| ESLint | **Passed** |
| Frontend production build | **Passed** |
| Docker Compose dev/prod/monitoring validation | **Passed** |
| Docker backend image build | **Passed** |
| Docker runtime health | **Backend healthy; SQL Server healthy** |
| API runtime/OpenAPI | **8 route membership xuất hiện đúng; request không token trả 401** |

## 5. Ghi nhận ngoài phạm vi

- `black --check .` trên toàn bộ backend phát hiện 5 file cũ từ commit trước chưa đúng định dạng Black. Các file này không thuộc chức năng quản lý thành viên và không được sửa để tuân thủ yêu cầu không động code ngoài phạm vi.
- Tất cả file Python thay đổi trong lần triển khai này đã qua `black --check` riêng và đạt.
- Frontend build vẫn có cảnh báo bundle lớn hơn 500 kB đã tồn tại trước đó; build hoàn tất thành công và cảnh báo không liên quan chức năng này.
- README không cần thay đổi vì không có thay đổi về cài đặt, biến môi trường hoặc quy trình chạy hệ thống. Chức năng mới được ghi vào `CHANGELOG.md`.

## 6. Kết luận

Chức năng quản lý thành viên phòng ban/team đã được bổ sung đúng phạm vi, quyền được chặn tại backend và giao diện phản ánh đúng quyền thao tác. Các luồng thêm, gỡ, chuyển, tự rời nhóm/phòng ban và chuyển chéo tổ chức đã được kiểm tra bằng test tự động và runtime Docker.

Phần thông tin commit, tag và trạng thái GitHub Actions sẽ được cập nhật sau khi push hoàn tất.

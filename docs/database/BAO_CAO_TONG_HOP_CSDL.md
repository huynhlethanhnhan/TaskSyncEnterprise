# Báo Cáo Chi Tiết Hệ Quản Trị Cơ Sở Dữ Liệu
## Đề Tài: Hệ Thống Quản Lý Công Việc Agile & Mở Rộng Quản Trị Nhân Sự (TaskSyncEnterprise)

> **Trạng thái tài liệu:** Bản nháp tổng hợp sau khi nâng cấp kiến trúc CSDL, bổ sung mở rộng HRM, `RULE`, `CURSOR`, `BACKUP/ROLLBACK`, tối ưu hóa 2 câu truy vấn 3 bảng và chạy kiểm thử tự động trên Microsoft SQL Server.  
> **Lưu ý trước khi nộp:** Vui lòng rà soát kỹ các phần chuyên môn bên dưới và điền/xác nhận lại bảng **Thông tin thành viên & Mức đánh giá % (cách nhau tối thiểu 5%)** ở **Mục 7**.

---

## Mục Lục
1. [Tổng Quan Kiến Trúc & Khả Năng Mở Rộng HRM](#1-tổng-quan-kiến-trúc--khả-năng-mở-rộng-hrm)
2. [Yêu Cầu 1 (1.0đ): Xây Dựng CSDL, Dữ Liệu Mẫu & Đặt Tên Ràng Buộc](#2-yêu-cầu-1-10đ-xây-dựng-csdl-dữ-liệu-mẫu--đặt-tên-ràng-buộc)
3. [Yêu Cầu 2 (1.0đ): Áp Dụng 2 RULE Cho Nghiệp Vụ Theo Chủ Đề](#3-yêu-cầu-2-10đ-áp-dụng-2-rule-cho-nghiệp-vụ-theo-chủ-đề)
4. [Yêu Cầu 3 (2.0đ): Phân Tích & Xây Dựng Trigger (Có Áp Dụng Cursor)](#4-yêu-cầu-3-20đ-phân-tích--xây-dựng-trigger-có-áp-dụng-cursor)
5. [Yêu Cầu 4 (2.0đ): Xây Dựng Stored Procedure (Có Cursor, Rollback & Backup)](#5-yêu-cầu-4-20đ-xây-dựng-stored-procedure-có-cursor-rollback--backup)
6. [Yêu Cầu 5 (2.0đ): Tối Ưu Hóa 2 Câu Truy Vấn Tra Cứu 3 Bảng](#6-yêu-cầu-5-20đ-tối-ưu-hóa-2-câu-truy-vấn-tra-cứu-3-bảng)
7. [Chiến Lược Sao Lưu (Backup), Phục Hồi (Rollback) & Kết Quả Kiểm Thử](#7-chiến-lược-sao-lưu-backup-phục-hồi-rollback--kết-quả-kiểm-thử)
8. [Yêu Cầu 6 (2.0đ): Thông Tin Thành Viên & Đánh Giá Mức Độ Hoàn Thành](#8-yêu-cầu-6-20đ-thông-tin-thành-viên--đánh-giá-mức-độ-hoàn-thành)

---

## 1. Tổng Quan Kiến Trúc & Khả Năng Mở Rộng HRM

**TaskSyncEnterprise** được thiết kế theo mô hình **Database-First** trên **Microsoft SQL Server 2019 / 2022** (hỗ trợ Unicode `NVARCHAR` và chuẩn thời gian UTC `SYSUTCDATETIME()`), tách làm **3 phân hệ liên kết chặt chẽ** qua thực thể trung tâm `dbo.employees`:

```text
                       ┌──────────────────────────────────┐
                       │   1. QUẢN TRỊ TỔ CHỨC (CORE)     │
                       │  roles ─ departments ─ teams     │
                       │            └─► employees ◄─┘     │
                       └────────────────┬─────────────────┘
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              ▼                                                   ▼
┌───────────────────────────────────────┐       ┌───────────────────────────────────────┐
│   2. QUẢN LÝ CÔNG VIỆC AGILE          │       │   3. MỞ RỘNG NHÂN SỰ & QUẢN TRỊ (HRM) │
│  - projects, project_members          │       │  - vacations (Nghỉ phép)               │
│  - sprints, sprint_snapshots          │       │  - leave_balances (Quỹ phép năm)      │
│  - discussion_topics, backlog_items   │       │  - employment_contracts (Hợp đồng)    │
│  - tasks, task_assignments            │       │  - attendance_logs (Chấm công)        │
│  - notifications                      │       │  - audit_logs, backup_history_logs    │
└───────────────────────────────────────┘       └───────────────────────────────────────┘
```

### Điểm thiết kế mở rộng cho HRM và lộ trình tiến hóa lên ERM
* **Không trùng lặp thực thể nhân sự:** Toàn bộ phân hệ Quản lý Công việc và HRM dùng chung trục `departments` → `teams` → `employees`.
* **Sẵn sàng tích hợp tính lương & đánh giá (Pha 1 — HRM Core):** Đã tách riêng bảng `employment_contracts` (lương cơ bản, phụ cấp, loại hợp đồng), `attendance_logs` (giờ công, tăng ca OT), `vacations` và `leave_balances` (cột tính toán tự động `remaining_days`).
* **Cầu nối mở rộng lên ERM (Pha 2 — Enterprise Resource Management):** Từ nền tảng Work Management + HRM, hệ thống có thể mở rộng thành ERM hoàn chỉnh mà không phá vỡ cấu trúc hiện hữu bằng cách ghép thêm các bảng cầu nối: `project_budgets` (ngân sách dự án), `time_entries` (quy đổi giờ làm việc thành chi phí nhân công), và `assets` / `asset_assignments` (cấp phát thiết bị, thu hồi tự động khi offboarding).
* **Bảo vệ dữ liệu cấp hệ thống:** Hỗ trợ xóa mềm (`is_deleted`, `deleted_at`, `deleted_by_id`), nhật ký kiểm toán (`audit_logs`) và nhật ký sao lưu/khôi phục (`backup_history_logs`).

### Danh mục tập lệnh T-SQL trong thư mục `Database/`

| Thành phần | Đường dẫn tệp | Chức năng chính |
|---|---|---|
| **DDL & Rules** | [`Database/Scripts/01_create_tables_and_constraints.sql`](../Database/Scripts/01_create_tables_and_constraints.sql) | Tạo CSDL, 19 bảng, toàn bộ ràng buộc đặt tên tường minh và 3 `RULE`. |
| **Seed Data** | [`Database/Scripts/02_seed_initial_data.sql`](../Database/Scripts/02_seed_initial_data.sql) | Chèn dữ liệu mẫu idempotent cho cả Work Management và HRM. |
| **Triggers** | [`Database/Triggers/02_triggers.sql`](../Database/Triggers/02_triggers.sql) | 6 Trigger T-SQL (Soft-Delete, Audit Trail, Agile, HRM Cursor & Rollback phép). |
| **Stored Procedures** | [`Database/Procedures/03_stored_procedures.sql`](../Database/Procedures/03_stored_procedures.sql) | 6 Stored Procedure (Thống kê, Burndown, Đóng Sprint ACID, Cursor, Rollback, Backup). |
| **Views** | [`Database/Procedures/04_views.sql`](../Database/Procedures/04_views.sql) | 4 Views toàn cục tự động lọc xóa mềm và tổng hợp dữ liệu HRM. |
| **Indexes** | [`Database/Indexes/05_query_optimization_indexes.sql`](../Database/Indexes/05_query_optimization_indexes.sql) | B-Tree FK Index, Covering Index (`INCLUDE`), Filtered Index. |
| **3-Table Queries** | [`Database/Indexes/06_query_optimization_3_tables.sql`](../Database/Indexes/06_query_optimization_3_tables.sql) | 2 bài toán truy vấn 3 bảng đối chiếu bản Cơ bản vs Tối ưu. |
| **Test Suite** | [`Database/Verification/07_test_and_demo_scenarios.sql`](../Database/Verification/07_test_and_demo_scenarios.sql) | 13 Test Case tự động kiểm chứng toàn bộ nghiệp vụ. |
| **Backup Strategy** | [`Database/Backup/08_backup_and_restore_strategy.sql`](../Database/Backup/08_backup_and_restore_strategy.sql) | Kịch bản Full/Differential Backup và khôi phục Point-in-Time. |

---

## 2. Yêu Cầu 1 (1.0đ): Xây Dựng CSDL, Dữ Liệu Mẫu & Đặt Tên Ràng Buộc

### 2.1. Danh sách 19 bảng và các ràng buộc đặt tên cụ thể
Tất cả ràng buộc trong [`01_create_tables_and_constraints.sql`](../../Database/Scripts/01_create_tables_and_constraints.sql) đều được đặt tên theo chuẩn tiền tố `PK_`, `FK_`, `UQ_`, `CK_`, `DF_`:

| STT | Tên bảng | Phân hệ | Ràng buộc chính đã đặt tên tường minh |
|---|---|---|---|
| 1 | `dbo.roles` | Tổ chức | `PK_roles`, `UQ_roles_role_name`, `DF_roles_is_system`, `DF_roles_created_at` |
| 2 | `dbo.departments` | Tổ chức | `PK_departments`, `UQ_departments_department_code`, `UQ_departments_name`, `FK_departments_manager`, `DF_departments_is_active` |
| 3 | `dbo.teams` | Tổ chức | `PK_teams`, `UQ_teams_team_code`, `FK_teams_department`, `FK_teams_leader`, `DF_teams_is_active` |
| 4 | `dbo.employees` | Tổ chức | `PK_employees`, `UQ_employees_code`, `UQ_employees_email`, `FK_employees_role`, `FK_employees_department`, `FK_employees_team`, `FK_employees_manager`, `DF_employees_status`, `DF_employees_is_deleted` |
| 5 | `dbo.audit_logs` | Kiểm toán | `PK_audit_logs`, `FK_audit_logs_employee`, `DF_audit_logs_timestamp` |
| 6 | `dbo.projects` | Công việc | `PK_projects`, `UQ_projects_code`, `FK_projects_department`, `FK_projects_team`, `FK_projects_creator`, `CK_projects_priority`, `DF_projects_status`, `DF_projects_is_deleted` |
| 7 | `dbo.project_members` | Công việc | `PK_project_members`, `UQ_project_members_project_employee`, `FK_project_members_project`, `FK_project_members_employee`, `DF_project_members_role` |
| 8 | `dbo.sprints` | Công việc | `PK_sprints`, `FK_sprints_project`, `CK_sprints_status`, `DF_sprints_status`, `DF_sprints_capacity` |
| 9 | `dbo.sprint_snapshots` | Công việc | `PK_sprint_snapshots`, `UQ_sprint_snapshots_date`, `FK_sprint_snapshots_sprint`, `DF_snapshots_rem_sp` |
| 10 | `dbo.discussion_topics` | Công việc | `PK_discussion_topics`, `FK_discussion_topics_project`, `FK_discussion_topics_creator` |
| 11 | `dbo.tasks` | Công việc | `PK_tasks`, `FK_tasks_project`, `FK_tasks_sprint`, `FK_tasks_topic`, `FK_tasks_creator`, `CK_tasks_status`, `CK_tasks_priority`, `CK_tasks_progress`, `DF_tasks_priority`, `DF_tasks_status` |
| 12 | `dbo.task_assignments` | Công việc | `PK_task_assignments`, `UQ_task_assignments_task_emp`, `FK_task_assignments_task`, `FK_task_assignments_employee` |
| 13 | `dbo.backlog_items` | Công việc | `PK_backlog_items`, `FK_backlog_items_project`, `FK_backlog_items_sprint`, `FK_backlog_items_task`, `DF_backlog_items_sp` |
| 14 | `dbo.notifications` | Thông báo | `PK_notifications`, `FK_notifications_employee`, `CK_notifications_priority`, `CK_notifications_status`, `CK_notifications_channel` |
| 15 | `dbo.vacations` | **HRM** | `PK_vacations`, `FK_vacations_requester`, `FK_vacations_approver`, `CK_vacations_dates`, `CK_vacations_type`, `CK_vacations_status` |
| 16 | `dbo.leave_balances` | **HRM** | `PK_leave_balances`, `UQ_leave_balances_emp_year`, `FK_leave_balances_employee`, `CK_leave_balances_year`, `CK_leave_balances_non_negative` |
| 17 | `dbo.employment_contracts` | **HRM** | `PK_employment_contracts`, `UQ_employment_contracts_code`, `FK_employment_contracts_employee`, `CK_employment_contracts_type`, `CK_employment_contracts_status`, `CK_employment_contracts_salary`, `CK_employment_contracts_dates` |
| 18 | `dbo.attendance_logs` | **HRM** | `PK_attendance_logs`, `UQ_attendance_logs_emp_date`, `FK_attendance_logs_employee`, `CK_attendance_logs_status`, `CK_attendance_logs_hours` |
| 19 | `dbo.backup_history_logs` | **Quản trị** | `PK_backup_history_logs`, `FK_backup_history_employee`, `CK_backup_history_type`, `CK_backup_history_status` |

### 2.2. Dữ liệu mẫu khởi tạo (Seed Data)
File [`02_seed_initial_data.sql`](../../Database/Scripts/02_seed_initial_data.sql) nạp sẵn dữ liệu đồng bộ cho cả 2 phân hệ theo cơ chế **idempotent** (chạy lại nhiều lần không trùng lặp và không lỗi):
* **Tổ chức & Công việc:** 3 vai trò (`Admin`, `Manager`, `Employee`), 2 phòng ban (`DEPT-TECH`, `DEPT-PROD`), 2 team, 4 nhân viên, 2 dự án (`PRJ-TASKSYNC-DEMO`, `PRJ-HRM-PHASE2`), 2 sprint, 4 task kèm phân công, discussion topic, backlog item, sprint snapshots.
* **HRM:** 4 bản ghi quỹ phép năm `leave_balances`, 3 hợp đồng lao động `employment_contracts`, 3 đơn nghỉ phép `vacations` (gồm trạng thái `Pending`, `Manager Approved`, `HR Approved`), và dữ liệu chấm công `attendance_logs`.

---

## 3. Yêu Cầu 2 (1.0đ): Áp Dụng 2 RULE Cho Nghiệp Vụ Theo Chủ Đề

Hệ thống áp dụng đúng đối tượng **`RULE`** bản địa của SQL Server bằng lệnh `CREATE RULE` và gắn trực tiếp vào cột dữ liệu bằng `EXEC sys.sp_bindrule` (tại Phần 5 của [`01_create_tables_and_constraints.sql`](../../Database/Scripts/01_create_tables_and_constraints.sql)).

### Rule 1: `dbo.rul_TaskStoryPoints_NonNegative` (Nghiệp vụ Agile)
* **Mục đích:** Đảm bảo điểm ước lượng khối lượng công việc (`story_points`) của Task và Backlog Item luôn nằm trong miền hợp lệ từ `0` đến `100` (không cho phép nhập số âm hoặc con số phi lý).
* **Câu lệnh cài đặt:**
  ```sql
  CREATE RULE dbo.rul_TaskStoryPoints_NonNegative
  AS @sp >= 0 AND @sp <= 100;
  GO

  EXEC sys.sp_bindrule N'dbo.rul_TaskStoryPoints_NonNegative', N'dbo.tasks.story_points';
  EXEC sys.sp_bindrule N'dbo.rul_TaskStoryPoints_NonNegative', N'dbo.backlog_items.story_points';
  GO
  ```
* **Kết quả kiểm thử thực tế (`TC01A`):** Khi thử chèn `story_points = -5` vào `dbo.tasks`, SQL Server từ chối với lỗi: `A column insert or update conflicts with a rule imposed by a previous CREATE RULE statement... column 'story_points'`.

### Rule 2: `dbo.rul_EmployeeEmailFormat` (Nghiệp vụ Quản trị Nhân sự HRM)
* **Mục đích:** Mọi nhân viên trong hệ thống phải có địa chỉ email doanh nghiệp đúng cấu trúc tối thiểu (có ký tự trước `@`, có tên miền chứa dấu `.`, không chứa khoảng trắng).
* **Câu lệnh cài đặt:**
  ```sql
  CREATE RULE dbo.rul_EmployeeEmailFormat
  AS @email LIKE N'%_@__%.__%' AND @email NOT LIKE N'% %';
  GO

  EXEC sys.sp_bindrule N'dbo.rul_EmployeeEmailFormat', N'dbo.employees.email';
  GO
  ```
* **Kết quả kiểm thử thực tế (`TC01B`):** Khi thử chèn email `'khong_hop_le'`, SQL Server chặn ngay tại tầng CSDL.

*(Ngoài ra hệ thống còn bổ sung **Rule 3**: `dbo.rul_EmployeeEmploymentStatus_HRM` gắn vào `dbo.employees.employment_status` để chuẩn hóa trạng thái hợp đồng/nhân sự theo chuẩn HRM).*

---

## 4. Yêu Cầu 3 (2.0đ): Phân Tích & Xây Dựng Trigger (Có Áp Dụng Cursor)

Thư mục [`Database/Triggers/02_triggers.sql`](../../Database/Triggers/02_triggers.sql) cài đặt **6 Trigger**. Dưới đây là phân tích chi tiết **3 Trigger trọng tâm** đại diện cho 3 kỹ thuật: `INSTEAD OF DELETE`, `AFTER UPDATE` và `AFTER INSERT/UPDATE` kết hợp **`CURSOR` + `ROLLBACK`**:

### 4.1. Trigger 1: `dbo.trg_Tasks_SoftDelete_InsteadOf` (`INSTEAD OF DELETE` — Bảo vệ Xóa mềm & Audit Trail)
* **Phân tích nghiệp vụ:** Trong hệ thống doanh nghiệp, tuyệt đối không được phép xóa vật lý (`Hard Delete`) các bản ghi công việc (`dbo.tasks`), tránh mất dấu lịch sử dự án khi người dùng hoặc DBA lỡ chạy lệnh `DELETE FROM dbo.tasks`.
* **Đầu vào / Cơ chế hoạt động:**
  1. Khi phát sinh lệnh `DELETE`, SQL Server chặn lệnh xóa gốc và nạp các dòng sắp xóa vào bảng ảo `deleted`.
  2. Trigger chuyển đổi thao tác thành `UPDATE dbo.tasks SET is_deleted = 1, deleted_at = SYSUTCDATETIME()`.
  3. Ghi lại đầy đủ thông tin cũ/mới vào `dbo.audit_logs` với hành động `SOFT_DELETE_TASK`.
* **Mã nguồn cốt lõi:**
  ```sql
  CREATE TRIGGER dbo.trg_Tasks_SoftDelete_InsteadOf
  ON dbo.tasks
  INSTEAD OF DELETE
  AS
  BEGIN
      SET NOCOUNT ON;
      UPDATE t
      SET t.is_deleted = 1, t.deleted_at = SYSUTCDATETIME()
      FROM dbo.tasks t
      INNER JOIN deleted d ON t.id = d.id;

      INSERT INTO dbo.audit_logs (employee_id, action, entity_type, entity_id, old_values, new_values, timestamp)
      SELECT COALESCE(d.deleted_by_id, d.updated_by_id, d.created_by), N'SOFT_DELETE_TASK', N'Task', d.id,
             N'Title: ' + ISNULL(d.title, N'') + N' | Status: ' + ISNULL(d.status, N''),
             N'is_deleted = 1 | deleted_at = ' + CONVERT(NVARCHAR(30), SYSUTCDATETIME(), 126),
             SYSUTCDATETIME()
      FROM deleted d;
  END;
  ```

### 4.2. Trigger 2 (HRM + CURSOR + ROLLBACK): `dbo.trg_Vacations_ApproveAndLeaveBalance`
* **Phân tích nghiệp vụ (Mở rộng HRM):** Khi nhân viên gửi hoặc quản lý/HR duyệt đơn nghỉ phép trên bảng `dbo.vacations`, CSDL phải tự động:
  1. **Chặn tự duyệt:** Không cho phép `requested_by = approved_by` khi chuyển trạng thái duyệt (`Manager Approved`, `HR Approved`, `Approved`).
  2. **Chặn trùng lịch:** Không cho phép nhân viên tạo 2 đơn nghỉ phép có khoảng ngày `[start_date, end_date]` giao nhau.
  3. **Dùng `CURSOR LOCAL FAST_FORWARD`** duyệt từng dòng thay đổi trong `inserted` đối chiếu với `deleted`:
     * Nếu đơn `Annual Leave` chuyển sang **`HR Approved` / `Approved`**: tự động kiểm tra quỹ phép năm trong `dbo.leave_balances`; nếu không đủ ngày phép còn lại → đóng cursor và **`ROLLBACK TRANSACTION`**; nếu đủ → cộng vào `used_days` và ghi log `DEDUCT_LEAVE_BALANCE`.
     * Nếu đơn đã duyệt bị **thu hồi / hủy / xóa mềm** (`Withdrawn`, `Cancelled`, `Pending`, `Rejected`): tự động **hoàn trả (rollback) số ngày phép** vào `dbo.leave_balances` và ghi log `ROLLBACK_LEAVE_BALANCE`.

### 4.3. Các Trigger toàn vẹn bổ sung khác trong `02_triggers.sql`
* `trg_Tasks_AuditTrail` (`AFTER UPDATE`): Đối chiếu 2 bảng ảo `inserted` và `deleted` để ghi vết thay đổi `status`, `priority`, `progress_percent`, `sprint_id`.
* `trg_Sprints_ActiveSprintConstraint` (`AFTER INSERT, UPDATE`): Mỗi dự án tại một thời điểm chỉ có tối đa 1 Sprint `Active`.
* `trg_Tasks_ValidateSprintProject` (`AFTER INSERT, UPDATE`): Ngăn chặn gán Task vào Sprint thuộc dự án khác.
* `trg_TaskAssignments_ValidateMember` (`AFTER INSERT, UPDATE`): Chỉ cho phép phân công Task cho nhân viên đã thuộc `project_members` hoặc là người tạo dự án.

---

## 5. Yêu Cầu 4 (2.0đ): Xây Dựng Stored Procedure (Có Cursor, Rollback & Backup)

Thư mục [`Database/Procedures/03_stored_procedures.sql`](../../Database/Procedures/03_stored_procedures.sql) gồm **6 Stored Procedures**, kết hợp tối ưu tổng hợp, xử lý giao dịch ACID, `CURSOR`, `SAVEPOINT ROLLBACK` và `BACKUP`:

| STT | Tên Stored Procedure | Kỹ thuật áp dụng | Nghiệp vụ giải quyết |
|---|---|---|---|
| 1 | `sp_GetProjectOverviewStats` | **Conditional Aggregation** (Single-pass) | Gom 6-7 truy vấn thống kê dashboard (tổng task, hoàn thành, quá hạn, story points, tiến độ TB, thành viên, số sprint) thành **1 lần quét bảng**. |
| 2 | `sp_GetSprintBurndownReport` | Multi-resultset query | Trả về thông tin tổng quan Sprint và chuỗi dữ liệu ngày từ `sprint_snapshots` để vẽ biểu đồ Burndown. |
| 3 | `sp_CloseSprintAndRollover` | **ACID Transaction + `MERGE`** | Đóng Sprint (`Completed`), chụp snapshot ngày cuối bằng `MERGE`, chuyển toàn bộ Task chưa `Done` sang Sprint kế tiếp hoặc về Backlog (`sprint_id = NULL`), ghi `audit_logs`. |
| 4 | `sp_AutoCheckOverdueTasksAndNotify` | **`CURSOR LOCAL FAST_FORWARD` + Transaction** | Quét toàn bộ Task quá hạn chưa `Done`, duyệt từng cặp `(Task, Assignee)` để tạo thông báo nhắc việc `TASK_OVERDUE` vào `dbo.notifications` (chống gửi trùng trong ngày qua `event_id`). |
| 5 | `sp_RollbackTaskFromAudit` | **`SAVE TRANSACTION` (Savepoint) + Audit Recovery** | Phục hồi Task đã bị xóa mềm (`RESTORE_SOFT_DELETE`) hoặc hoàn tác trạng thái trước đó từ `audit_logs` (`REVERT_LAST_STATUS`), ghi nhận vào `backup_history_logs`. |
| 6 | `sp_BackupDatabaseWithAudit` | **`BACKUP DATABASE` + `RESTORE VERIFYONLY`** | Tự động sao lưu `FULL` / `DIFFERENTIAL` ra file `.bak`, kiểm tra tính toàn vẹn bằng `RESTORE VERIFYONLY WITH CHECKSUM` và ghi log vào `backup_history_logs`. |

### 5.1. Phân tích chi tiết 2 Stored Procedure trọng tâm
1. **`dbo.sp_CloseSprintAndRollover (@SprintId, @NextSprintId, @ClosedByUserId)` (Giao dịch ACID + `MERGE`):**
   * **Bài toán nghiệp vụ:** Khi kết thúc một Sprint theo mô hình Scrum, hệ thống không thể chỉ `UPDATE status = 'Completed'` mà phải đồng thời chốt số liệu lịch sử và xử lý các công việc còn dang dở.
   * **Luồng xử lý nguyên tử (`SET XACT_ABORT ON` + `BEGIN TRANSACTION`):**
     1. Kiểm tra Sprint tồn tại (`is_deleted = 0`) và xác thực `@NextSprintId` (nếu có) phải thuộc cùng `project_id`.
     2. Cập nhật `dbo.sprints` sang `N'Completed'`.
     3. Dùng lệnh `MERGE dbo.sprint_snapshots` để ghi/cập nhật ảnh chụp tiến độ ngày đóng Sprint (`remaining_story_points`, `completed_story_points`).
     4. Chuyển toàn bộ Task chưa `Done` sang `@NextSprintId` (hoặc đưa về Product Backlog với `sprint_id = NULL`).
     5. Ghi vết vào `dbo.audit_logs`. Nếu bất kỳ bước nào lỗi → `ROLLBACK TRANSACTION` trong `BEGIN CATCH`.
2. **`dbo.sp_AutoCheckOverdueTasksAndNotify (@ProjectId = NULL)` (Áp dụng `CURSOR`):**
   * **Bài toán nghiệp vụ:** Quét định kỳ các công việc quá hạn (`deadline < SYSUTCDATETIME()` và `status <> N'Done'`) để gửi cảnh báo cá nhân hóa tới từng thành viên phụ trách.
   * **Kỹ thuật `CURSOR LOCAL FAST_FORWARD`:** Mở con trỏ duyệt từng dòng `(task_id, title, project_name, employee_id, deadline)`, sinh khóa chống trùng theo ngày `OVERDUE_TASK_<TaskId>_<YYYY-MM-DD>` và chỉ `INSERT` vào `dbo.notifications` khi nhân viên chưa nhận thông báo đó trong ngày. Kết thúc luôn `CLOSE` và `DEALLOCATE` con trỏ kể cả khi rơi vào `BEGIN CATCH`.

---

## 6. Yêu Cầu 5 (2.0đ): Tối Ưu Hóa 2 Câu Truy Vấn Tra Cứu 3 Bảng

File thực thi đối chiếu: [`Database/Indexes/06_query_optimization_3_tables.sql`](../../Database/Indexes/06_query_optimization_3_tables.sql).

### 6.1. Bài Toán 1 (Phân hệ Quản lý Công việc): `projects` — `sprints` — `tasks`
**Yêu cầu tra cứu:** Liệt kê danh sách công việc chưa hoàn thành (`status <> 'Done'`), độ ưu tiên `High` hoặc `Urgent`, thuộc các `Sprint` đang chạy (`Active`) của các `Project` đang triển khai (`In Progress`) có độ ưu tiên `High`.

* **3 bảng liên kết:** `projects (P)`, `sprints (S)`, `tasks (T)`.
* **Điều kiện lọc riêng trên TỪNG bảng:**
  * Bảng `P`: $P.\text{is\_deleted}=0 \land P.\text{status}=\text{N'In Progress'} \land P.\text{priority}=\text{N'High'}$
  * Bảng `S`: $S.\text{is\_deleted}=0 \land S.\text{status}=\text{N'Active'}$
  * Bảng `T`: $T.\text{is\_deleted}=0 \land T.\text{status}\neq \text{N'Done'} \land T.\text{priority} \in \{\text{N'High'}, \text{N'Urgent'}\}$

#### Bước 1: Câu lệnh truy vấn cơ bản (Tích Đề-các & lọc muộn)
```sql
SELECT
    P.project_code, P.name AS project_name, S.name AS sprint_name,
    T.id AS task_id, T.title AS task_title, T.priority AS task_priority,
    T.status AS task_status, T.progress_percent, T.deadline
FROM dbo.projects P, dbo.sprints S, dbo.tasks T
WHERE P.id = S.project_id
  AND S.id = T.sprint_id
  AND P.is_deleted = 0 AND P.status = N'In Progress' AND P.priority = N'High'
  AND S.is_deleted = 0 AND S.status = N'Active'
  AND T.is_deleted = 0 AND T.status <> N'Done' AND T.priority IN (N'High', N'Urgent');
```

#### Bước 2: Cây truy vấn cơ bản (Canonical Query Tree)
```text
        π (P.project_code, P.name, S.name, T.id, T.title, T.priority, T.status, T.progress_percent, T.deadline)
        │
        σ (P.id=S.project_id ∧ S.id=T.sprint_id
           ∧ P.is_deleted=0 ∧ P.status='In Progress' ∧ P.priority='High'
           ∧ S.is_deleted=0 ∧ S.status='Active'
           ∧ T.is_deleted=0 ∧ T.status<>'Done' ∧ T.priority IN ('High','Urgent'))
        │
        ×
       / \
      ×   T (tasks)
     / \
P (projects)  S (sprints)
```
*(Nhược điểm: Tích Đề-các $P \times S \times T$ sinh ra không gian bộ trung gian rất lớn trước khi điều kiện chọn $\sigma$ được áp dụng ở phía trên).*

#### Bước 3: Cây truy vấn tối ưu (Optimized Query Tree)
Áp dụng các quy tắc tối ưu hóa đại số quan hệ:
1. Tách phép chọn hội ($\sigma_{c_1 \land c_2 \land c_3}$) và **đẩy phép chọn $\sigma$ xuống sát từng bảng lá**.
2. Chuyển tích Đề-các $\times$ kết hợp điều kiện bằng thành **phép kết nối $\bowtie$**.
3. **Đẩy phép chiếu $\pi$ xuống sớm** trên từng nhánh để chỉ giữ lại khóa kết nối và các cột hiển thị, kết hợp bộ **Filtered & Covering Index** (`IX_projects_active_status_priority`, `UQ_sprints_active_filtered`, `IX_tasks_sprint_priority_active`).

```text
                                 π (P.project_code, P.name, S.name, T.id, T.title, T.priority, T.status, T.progress_percent, T.deadline)
                                 │
                                ⋈ (S.id = T.sprint_id)
                              /   \
                             /     \
             ⋈ (P.id = S.project_id)        π (id, sprint_id, title, priority, status, progress_percent, deadline)
            /             \                  │
           /               \                 σ (is_deleted=0 ∧ status<>'Done' ∧ priority IN ('High','Urgent'))
  π (id, project_code, name)   π (id, project_id, name)    │
          │                        │                     T (tasks)
  σ (is_deleted=0          σ (is_deleted=0
     ∧ status='In Progress'   ∧ status='Active')
     ∧ priority='High')            │
          │                    S (sprints)
      P (projects)
```

#### Bước 4: Câu lệnh truy vấn tối ưu (Tương ứng Cây tối ưu)
```sql
WITH FilteredProjects AS (
    SELECT id, project_code, name
    FROM dbo.projects
    WHERE is_deleted = 0 AND status = N'In Progress' AND priority = N'High'
),
FilteredSprints AS (
    SELECT id, project_id, name
    FROM dbo.sprints
    WHERE is_deleted = 0 AND status = N'Active'
),
FilteredTasks AS (
    SELECT id, sprint_id, title, priority, status, progress_percent, deadline
    FROM dbo.tasks
    WHERE is_deleted = 0 AND status <> N'Done' AND priority IN (N'High', N'Urgent')
)
SELECT
    P.project_code, P.name AS project_name, S.name AS sprint_name,
    T.id AS task_id, T.title AS task_title, T.priority AS task_priority,
    T.status AS task_status, T.progress_percent, T.deadline
FROM FilteredProjects P
INNER JOIN FilteredSprints S ON P.id = S.project_id
INNER JOIN FilteredTasks T ON S.id = T.sprint_id;
```

---

### 6.2. Bài Toán 2 (Phân hệ Mở rộng HRM): `departments` — `employees` — `vacations`
**Yêu cầu tra cứu:** Tra cứu danh sách đơn xin nghỉ phép đang chờ duyệt (`Pending` hoặc `Manager Approved`) của các nhân viên đang làm việc thuộc Phòng Kỹ thuật & Công nghệ (`DEPT-TECH`).

* **3 bảng liên kết:** `departments (D)`, `employees (E)`, `vacations (V)`.
* **Điều kiện lọc riêng trên TỪNG bảng:**
  * Bảng `D`: $D.\text{is\_active}=1 \land D.\text{department\_code}=\text{N'DEPT-TECH'}$
  * Bảng `E`: $E.\text{is\_active}=1 \land E.\text{is\_deleted}=0$
  * Bảng `V`: $V.\text{is\_deleted}=0 \land V.\text{status} \in \{\text{N'Pending'}, \text{N'Manager Approved'}\}$

#### Bước 1: Câu lệnh truy vấn cơ bản
```sql
SELECT
    D.department_code, D.name AS department_name,
    E.employee_code, E.full_name, E.job_title,
    V.id AS vacation_id, V.type AS leave_type, V.start_date, V.end_date, V.status AS vacation_status
FROM dbo.departments D, dbo.employees E, dbo.vacations V
WHERE D.id = E.department_id
  AND E.id = V.requested_by
  AND D.is_active = 1 AND D.department_code = N'DEPT-TECH'
  AND E.is_active = 1 AND E.is_deleted = 0
  AND V.is_deleted = 0 AND V.status IN (N'Pending', N'Manager Approved');
```

#### Bước 2: Cây truy vấn cơ bản
```text
        π (D.department_code, D.name, E.employee_code, E.full_name, E.job_title, V.id, V.type, V.start_date, V.end_date, V.status)
        │
        σ (D.id=E.department_id ∧ E.id=V.requested_by
           ∧ D.is_active=1 ∧ D.department_code='DEPT-TECH'
           ∧ E.is_active=1 ∧ E.is_deleted=0
           ∧ V.is_deleted=0 ∧ V.status IN ('Pending','Manager Approved'))
        │
        ×
       / \
      ×   V (vacations)
     / \
D (departments)  E (employees)
```

#### Bước 3: Cây truy vấn tối ưu
```text
                                 π (D.department_code, D.name, E.employee_code, E.full_name, E.job_title, V.id, V.type, V.start_date, V.end_date, V.status)
                                 │
                                ⋈ (E.id = V.requested_by)
                              /   \
                             /     \
             ⋈ (D.id = E.department_id)          π (id, requested_by, type, start_date, end_date, status)
            /             \                        │
           /               \                       σ (is_deleted=0 ∧ status IN ('Pending','Manager Approved'))
  π (id, department_code, name)   π (id, department_id,        │
          │                          employee_code,        V (vacations)
  σ (is_active=1                     full_name, job_title)
     ∧ department_code='DEPT-TECH')       │
          │                       σ (is_active=1 ∧ is_deleted=0)
    D (departments)                       │
                                      E (employees)
```

#### Bước 4: Câu lệnh truy vấn tối ưu
```sql
WITH FilteredDepartments AS (
    SELECT id, department_code, name
    FROM dbo.departments
    WHERE is_active = 1 AND department_code = N'DEPT-TECH'
),
FilteredEmployees AS (
    SELECT id, department_id, employee_code, full_name, job_title
    FROM dbo.employees
    WHERE is_active = 1 AND is_deleted = 0
),
FilteredVacations AS (
    SELECT id, requested_by, type, start_date, end_date, status
    FROM dbo.vacations
    WHERE is_deleted = 0 AND status IN (N'Pending', N'Manager Approved')
)
SELECT
    D.department_code, D.name AS department_name,
    E.employee_code, E.full_name, E.job_title,
    V.id AS vacation_id, V.type AS leave_type, V.start_date, V.end_date, V.status AS vacation_status
FROM FilteredDepartments D
INNER JOIN FilteredEmployees E ON D.id = E.department_id
INNER JOIN FilteredVacations V ON E.id = V.requested_by;
```

### 6.3. Kết quả đo thực nghiệm `SET STATISTICS IO / TIME` trên SQL Server
*(Chạy trực tiếp trên bộ dữ liệu mẫu khởi tạo)*:
* **Bài toán 1:** Trả về chính xác 2 bản ghi giống nhau ở cả 2 phiên bản (`tasks`: logical reads = 4, `projects`: logical reads = 2, `sprints`: logical reads = 2, CPU = 0 ms, Elapsed = 0 ms).
* **Bài toán 2:** Trả về chính xác 1 bản ghi giống nhau ở cả 2 phiên bản (`vacations`: logical reads = 12, `employees`: logical reads = 2, `departments`: logical reads = 2, CPU = 0 ms, Elapsed = 0 ms).
* *Nhận xét:* Trên tập dữ liệu mẫu nhỏ, Query Optimizer của SQL Server tự động sinh kế hoạch tối ưu tương đương khi có sẵn bộ Filtered/Covering Indexes (`IX_projects_active_status_priority`, `IX_tasks_sprint_priority_active`, `IX_employees_dept_active_covering`, `IX_vacations_requester_status_active`). Khi dữ liệu tăng lên hàng chục nghìn bản ghi, cấu trúc cây tối ưu + Covering Index đảm bảo giữ độ phức tạp tìm kiếm ở $O(\log N)$ và loại bỏ thao tác `Key Lookup`.

---

## 7. Chiến Lược Sao Lưu (Backup), Phục Hồi (Rollback) & Kết Quả Kiểm Thử

### 7.1. Cơ chế Backup & Rollback 2 tầng
1. **Tầng Dữ liệu / Giao dịch (Logical Rollback):**
   * Mọi Stored Procedure nghiệp vụ đều bật `SET XACT_ABORT ON` và bọc trong `BEGIN TRANSACTION ... COMMIT / ROLLBACK`.
   * Thủ tục `sp_RollbackTaskFromAudit` dùng **`SAVE TRANSACTION`** để phục hồi bản ghi Task bị xóa mềm hoặc hoàn tác trạng thái theo `audit_logs`.
   * Trigger `trg_Vacations_ApproveAndLeaveBalance` tự động hoàn trả quỹ phép năm khi đơn nghỉ phép bị thu hồi/hủy.
2. **Tầng Hệ quản trị CSDL (Physical Backup & Point-in-Time Restore):**
   * File [`08_backup_and_restore_strategy.sql`](../../Database/Backup/08_backup_and_restore_strategy.sql) thiết lập mô hình `RECOVERY FULL`.
   * Thủ tục `sp_BackupDatabaseWithAudit` thực hiện `BACKUP DATABASE ... WITH INIT, CHECKSUM` và tự động chạy `RESTORE VERIFYONLY` kiểm tra file `.bak`, đồng thời lưu vết vào `dbo.backup_history_logs`.

### 7.2. Tổng hợp kết quả chạy kiểm thử tự động trên SQL Server
Kiểm thử toàn bộ bộ script trên SQL Server cục bộ (`sqlcmd -b`, chạy lại 2 lần kiểm tra idempotent) ngày **14/11/2026**:
* **Thống kê đối tượng tạo thành công:** `19 Tables` | `3 Rules` | `6 Triggers` | `6 Stored Procedures` | `4 Views` | `232 Indexes`.
* **Kết quả 13 nhóm Test Case (`07_test_and_demo_scenarios.sql`):** **100% PASS (Exit code 0)**:
  * `TC01A, TC01B`: `RULE` chặn thành công `story_points = -5` và email `'khong_hop_le'`.
  * `TC02A, TC02B`: `trg_Tasks_SoftDelete_InsteadOf` chuyển `DELETE` thành xóa mềm và `sp_RollbackTaskFromAudit` phục hồi lại thành công (`is_deleted = 0`).
  * `TC03A, TC03B`: `trg_Tasks_AuditTrail` ghi log `UPDATE_TASK_DETAILS` và `sp_RollbackTaskFromAudit` hoàn tác trạng thái về `To Do`.
  * `TC04, TC05, TC06`: Chặn thành công 2 Active Sprint cùng dự án, Task-Sprint khác dự án, và phân công nhân viên ngoài dự án.
  * `TC07A, TC07B, TC07C`: Trigger HRM chặn tự duyệt đơn; duyệt đơn trừ đúng `2.00` ngày phép (`used_days: 1.00 -> 3.00`); thu hồi đơn hoàn trả đúng `2.00` ngày phép (`3.00 -> 1.00`).
  * `TC08, TC09`: `sp_GetProjectOverviewStats`, `sp_GetSprintBurndownReport`, `sp_CloseSprintAndRollover` chạy thành công và chuyển task chưa xong về Backlog.
  * `TC10`: Cursor `sp_AutoCheckOverdueTasksAndNotify` phát sinh thông báo quá hạn.
  * `TC11`: `sp_BackupDatabaseWithAudit` sao lưu Full và chạy `RESTORE VERIFYONLY` trạng thái `VERIFIED`.
  * `TC12, TC13`: Toàn bộ 4 Views và 2 câu truy vấn 3 bảng trả kết quả chính xác.

---

## 8. Yêu Cầu 6 (2.0đ): Thông Tin Thành Viên & Đánh Giá Mức Độ Hoàn Thành

> **Ghi chú theo quy định giảng viên:** Dự án được thực hiện độc lập bởi **01 thành viên duy nhất** (các thành viên không tham gia/không đóng góp đã được loại bỏ khỏi danh sách đánh giá theo đúng quy định của giảng viên). Bạn chỉ cần điền **Họ tên** và **MSSV** của mình vào bảng dưới đây trước khi xuất nộp:

| STT | Họ và Tên | MSSV | Vai trò / Nội dung phụ trách | Mức độ hoàn thành (%) | Ghi chú |
|---|---|---|---|---|---|
| 1 | *[Điền Họ và Tên của bạn]* | *[Điền MSSV]* | Thực hiện toàn bộ đồ án (Thiết kế CSDL & mở rộng HRM, 3 `RULE`, 6 Triggers + Cursor, 6 Stored Procedures + Backup/Rollback, Tối ưu 2 truy vấn 3 bảng, Kiểm thử tự động & Báo cáo) | **100%** | Thực hiện độc lập 100% |

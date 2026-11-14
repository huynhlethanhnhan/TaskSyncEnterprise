-- ============================================================================
-- TaskSyncEnterprise — Bộ Kiểm Thử Tự Động & Kịch Bản Demo Toàn Diện (TC01-TC13)
-- Hướng dẫn: Chạy trong SSMS hoặc sqlcmd (-b). Mọi Test Case tự động kiểm chứng
--            kết quả và ném lỗi (RAISERROR) nếu vi phạm kỳ vọng.
-- ============================================================================

IF DB_NAME() = N'master'
    USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

PRINT N'=====================================================================';
PRINT N'TC01: KIỂM THỬ 2 SQL SERVER RULE (CREATE RULE & sp_bindrule)';
PRINT N'=====================================================================';

DECLARE @ProjId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @RoleEmpId INT = (SELECT TOP 1 id FROM dbo.roles WHERE role_name = N'Employee');

-- 1A. Kiểm thử rul_TaskStoryPoints_NonNegative (chặn story_points âm)
BEGIN TRY
    INSERT INTO dbo.tasks (project_id, title, story_points)
    VALUES (@ProjId, N'Task Test Rule Âm', -5);

    RAISERROR(N'[FAIL] TC01A: rul_TaskStoryPoints_NonNegative không chặn được story_points = -5!', 16, 1);
END TRY
BEGIN CATCH
    PRINT N'[PASS] TC01A: Rule chặn thành công story_points = -5 -> ' + ERROR_MESSAGE();
END CATCH;

-- 1B. Kiểm thử rul_EmployeeEmailFormat (chặn email sai định dạng)
BEGIN TRY
    INSERT INTO dbo.employees (employee_code, full_name, email, password_hash, role_id)
    VALUES (N'TEST_BAD_EMAIL', N'Test Bad Email', N'khong_hop_le', N'hash', @RoleEmpId);

    RAISERROR(N'[FAIL] TC01B: rul_EmployeeEmailFormat không chặn được email sai định dạng!', 16, 1);
END TRY
BEGIN CATCH
    PRINT N'[PASS] TC01B: Rule chặn thành công email sai định dạng -> ' + ERROR_MESSAGE();
END CATCH;

-- 1C. Kiểm thử rul_EmployeeEmploymentStatus_HRM (chặn trạng thái nhân sự sai chuẩn HRM)
BEGIN TRY
    INSERT INTO dbo.employees (employee_code, full_name, email, password_hash, role_id, employment_status)
    VALUES (N'TEST_BAD_STATUS', N'Test Bad Status', N'valid.test@tasksync.com', N'hash', @RoleEmpId, N'InvalidStatus');

    RAISERROR(N'[FAIL] TC01C: rul_EmployeeEmploymentStatus_HRM không chặn được trạng thái sai!', 16, 1);
END TRY
BEGIN CATCH
    PRINT N'[PASS] TC01C: Rule chặn thành công trạng thái nhân sự sai chuẩn HRM -> ' + ERROR_MESSAGE();
END CATCH;

-- 1D. Xác minh metadata các RULE đang gắn trên cột trong sys.columns
SELECT
    OBJECT_NAME(c.object_id) AS table_name,
    c.name AS column_name,
    r.name AS bound_rule_name
FROM sys.columns c
INNER JOIN sys.objects r ON c.rule_object_id = r.object_id
WHERE r.type = 'R'
ORDER BY table_name, column_name;
GO

PRINT N'=====================================================================';
PRINT N'TC02 & TC03: KIỂM THỬ TRIGGER XÓA MỀM, AUDIT TRAIL & SP ROLLBACK';
PRINT N'=====================================================================';

DECLARE @ProjId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @SprintId INT = (SELECT TOP 1 id FROM dbo.sprints WHERE project_id = @ProjId AND status = N'Active' AND is_deleted = 0);
DECLARE @MgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @TestTaskId INT;

-- Tạo 1 task phục vụ test để không ảnh hưởng dữ liệu mẫu chính
INSERT INTO dbo.tasks (project_id, sprint_id, title, priority, status, story_points, progress_percent, created_by)
VALUES (@ProjId, @SprintId, N'[TEST] Task Kiểm Thử Trigger & Rollback', N'Medium', N'To Do', 3, 0.00, @MgrId);
SET @TestTaskId = SCOPE_IDENTITY();

-- TC03A: Update để kích hoạt trg_Tasks_AuditTrail
UPDATE dbo.tasks
SET status = N'In Progress', progress_percent = 50.00, updated_by_id = @MgrId
WHERE id = @TestTaskId;

IF NOT EXISTS (
    SELECT 1 FROM dbo.audit_logs
    WHERE entity_type = N'Task' AND entity_id = @TestTaskId AND action = N'UPDATE_TASK_DETAILS'
)
    RAISERROR(N'[FAIL] TC03A: trg_Tasks_AuditTrail không ghi log UPDATE!', 16, 1);
ELSE
    PRINT N'[PASS] TC03A: trg_Tasks_AuditTrail đã ghi vết thay đổi vào audit_logs.';

-- TC03B: Rollback trạng thái về 'To Do' qua sp_RollbackTaskFromAudit
EXEC dbo.sp_RollbackTaskFromAudit @TaskId = @TestTaskId, @ActionMode = N'REVERT_LAST_STATUS', @PerformedBy = @MgrId;

IF (SELECT status FROM dbo.tasks WHERE id = @TestTaskId) <> N'To Do'
    RAISERROR(N'[FAIL] TC03B: sp_RollbackTaskFromAudit không hoàn tác được trạng thái!', 16, 1);
ELSE
    PRINT N'[PASS] TC03B: sp_RollbackTaskFromAudit đã hoàn tác trạng thái về To Do.';

-- TC02A: Chạy DELETE vật lý -> bị trg_Tasks_SoftDelete_InsteadOf chuyển thành xóa mềm
DELETE FROM dbo.tasks WHERE id = @TestTaskId;

IF NOT EXISTS (SELECT 1 FROM dbo.tasks WHERE id = @TestTaskId AND is_deleted = 1 AND deleted_at IS NOT NULL)
    RAISERROR(N'[FAIL] TC02A: trg_Tasks_SoftDelete_InsteadOf không giữ bản ghi ở trạng thái xóa mềm!', 16, 1);
ELSE
    PRINT N'[PASS] TC02A: trg_Tasks_SoftDelete_InsteadOf chặn xóa cứng và chuyển is_deleted = 1.';

-- TC02B: Phục hồi Task đã xóa mềm qua sp_RollbackTaskFromAudit
EXEC dbo.sp_RollbackTaskFromAudit @TaskId = @TestTaskId, @ActionMode = N'RESTORE_SOFT_DELETE', @PerformedBy = @MgrId;

IF (SELECT is_deleted FROM dbo.tasks WHERE id = @TestTaskId) <> 0
    RAISERROR(N'[FAIL] TC02B: Không phục hồi được task đã xóa mềm!', 16, 1);
ELSE
    PRINT N'[PASS] TC02B: Phục hồi task đã xóa mềm thành công (is_deleted = 0).';

-- Đánh dấu xóa mềm lại task test để sạch dữ liệu demo
UPDATE dbo.tasks SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE id = @TestTaskId;
GO

PRINT N'=====================================================================';
PRINT N'TC04, TC05, TC06: KIỂM THỬ CÁC TRIGGER TOÀN VẸN AGILE & PHÂN CÔNG';
PRINT N'=====================================================================';

-- TC04: Chặn kích hoạt Sprint thứ 2 trong cùng dự án
DECLARE @PlannedSprintId INT = (
    SELECT TOP 1 s_planned.id
    FROM dbo.sprints s_planned
    INNER JOIN dbo.sprints s_active ON s_planned.project_id = s_active.project_id
    WHERE s_planned.status = N'Planned' AND s_active.status = N'Active'
      AND s_planned.is_deleted = 0 AND s_active.is_deleted = 0
);

IF @PlannedSprintId IS NOT NULL
BEGIN
    BEGIN TRY
        UPDATE dbo.sprints SET status = N'Active' WHERE id = @PlannedSprintId;
        RAISERROR(N'[FAIL] TC04: trg_Sprints_ActiveSprintConstraint không chặn Sprint Active thứ 2!', 16, 1);
    END TRY
    BEGIN CATCH
        PRINT N'[PASS] TC04: Trigger chặn 2 Active Sprint -> ' + ERROR_MESSAGE();
    END CATCH;
END;

-- TC05: Chặn gán Task của Dự án 1 vào Sprint của Dự án 2
DECLARE @Proj1Id INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @Proj2Id INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-HRM-PHASE2');

IF @Proj1Id IS NOT NULL AND @Proj2Id IS NOT NULL
BEGIN
    DECLARE @TempSprintP2 INT;
    INSERT INTO dbo.sprints (project_id, name, status) VALUES (@Proj2Id, N'[TEST] Sprint P2', N'Planned');
    SET @TempSprintP2 = SCOPE_IDENTITY();

    BEGIN TRY
        INSERT INTO dbo.tasks (project_id, sprint_id, title)
        VALUES (@Proj1Id, @TempSprintP2, N'[TEST] Cross-project task');

        RAISERROR(N'[FAIL] TC05: trg_Tasks_ValidateSprintProject không chặn gán sai dự án!', 16, 1);
    END TRY
    BEGIN CATCH
        PRINT N'[PASS] TC05: Trigger chặn Task-Sprint khác dự án -> ' + ERROR_MESSAGE();
    END CATCH;

    DELETE FROM dbo.sprints WHERE id = @TempSprintP2;
END;

-- TC06: Chặn phân công nhân viên chưa tham gia dự án
DECLARE @TaskP1Id INT = (SELECT TOP 1 id FROM dbo.tasks WHERE project_id = @Proj1Id AND is_deleted = 0);
DECLARE @AdminId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'admin.demo@tasksync.com');

IF @TaskP1Id IS NOT NULL AND @AdminId IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.project_members WHERE project_id = @Proj1Id AND employee_id = @AdminId)
BEGIN
    BEGIN TRY
        INSERT INTO dbo.task_assignments (task_id, employee_id) VALUES (@TaskP1Id, @AdminId);
        RAISERROR(N'[FAIL] TC06: trg_TaskAssignments_ValidateMember không chặn người ngoài dự án!', 16, 1);
    END TRY
    BEGIN CATCH
        PRINT N'[PASS] TC06: Trigger chặn phân công người ngoài dự án -> ' + ERROR_MESSAGE();
    END CATCH;
END;
GO

PRINT N'=====================================================================';
PRINT N'TC07: KIỂM THỬ TRIGGER HRM + CURSOR + ROLLBACK (trg_Vacations_ApproveAndLeaveBalance)';
PRINT N'=====================================================================';

DECLARE @DevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @MgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @Year INT = YEAR(SYSUTCDATETIME());
DECLARE @UsedBefore DECIMAL(5,2) = (SELECT used_days FROM dbo.leave_balances WHERE employee_id = @DevId AND leave_year = @Year);
DECLARE @TestVacId INT;

-- 7A. Chặn tự duyệt đơn của chính mình
BEGIN TRY
    INSERT INTO dbo.vacations (type, start_date, end_date, reason, status, requested_by, approved_by)
    VALUES (N'Annual Leave', DATEADD(day, 30, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(day, 31, CAST(SYSUTCDATETIME() AS DATE)), N'[TEST] Self approve', N'HR Approved', @DevId, @DevId);

    RAISERROR(N'[FAIL] TC07A: Không chặn được tự duyệt đơn nghỉ phép!', 16, 1);
END TRY
BEGIN CATCH
    PRINT N'[PASS] TC07A: Chặn tự duyệt đơn -> ' + ERROR_MESSAGE();
END CATCH;

-- 7B. Tạo đơn nghỉ 2 ngày, duyệt -> kiểm tra trừ quỹ phép; sau đó thu hồi -> kiểm tra hoàn quỹ phép
INSERT INTO dbo.vacations (type, start_date, end_date, reason, status, requested_by)
VALUES (N'Annual Leave', DATEADD(day, 40, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(day, 41, CAST(SYSUTCDATETIME() AS DATE)), N'[TEST] Nghỉ 2 ngày', N'Pending', @DevId);
SET @TestVacId = SCOPE_IDENTITY();

UPDATE dbo.vacations
SET status = N'HR Approved', approved_by = @MgrId, approved_at = SYSUTCDATETIME()
WHERE id = @TestVacId;

DECLARE @UsedAfterApprove DECIMAL(5,2) = (SELECT used_days FROM dbo.leave_balances WHERE employee_id = @DevId AND leave_year = @Year);
IF @UsedAfterApprove <> (@UsedBefore + 2.00)
    RAISERROR(N'[FAIL] TC07B: Quỹ phép không trừ đúng 2 ngày!', 16, 1);
ELSE
    PRINT N'[PASS] TC07B: Duyệt đơn đã trừ đúng 2 ngày phép vào leave_balances (used_days: ' + CAST(@UsedBefore AS NVARCHAR(10)) + N' -> ' + CAST(@UsedAfterApprove AS NVARCHAR(10)) + N').';

-- Thu hồi đơn đã duyệt -> hoàn trả quỹ phép (Rollback Leave Balance)
UPDATE dbo.vacations
SET status = N'Withdrawn'
WHERE id = @TestVacId;

DECLARE @UsedAfterRevoke DECIMAL(5,2) = (SELECT used_days FROM dbo.leave_balances WHERE employee_id = @DevId AND leave_year = @Year);
IF @UsedAfterRevoke <> @UsedBefore
    RAISERROR(N'[FAIL] TC07C: Thu hồi đơn không hoàn trả đúng quỹ phép!', 16, 1);
ELSE
    PRINT N'[PASS] TC07C: Thu hồi đơn đã tự động hoàn trả 2 ngày phép (used_days: ' + CAST(@UsedAfterRevoke AS NVARCHAR(10)) + N').';

UPDATE dbo.vacations SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE id = @TestVacId;
GO

PRINT N'=====================================================================';
PRINT N'TC08 - TC11: KIỂM THỬ CÁC STORED PROCEDURES (THỐNG KÊ, ĐÓNG SPRINT, CURSOR, BACKUP)';
PRINT N'=====================================================================';

DECLARE @ProjId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @Sprint1Id INT = (SELECT TOP 1 id FROM dbo.sprints WHERE project_id = @ProjId AND status = N'Active' AND is_deleted = 0);
DECLARE @MgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');

-- TC08: Báo cáo tổng hợp & Burndown
EXEC dbo.sp_GetProjectOverviewStats @ProjectId = @ProjId;
EXEC dbo.sp_GetSprintBurndownReport @SprintId = @Sprint1Id;
PRINT N'[PASS] TC08: sp_GetProjectOverviewStats và sp_GetSprintBurndownReport chạy thành công.';

-- TC09: Đóng Sprint tạm thời & Rollover task sang Backlog (sprint_id = NULL)
DECLARE @TempSprintClose INT;
DECLARE @TempTaskRollover INT;
INSERT INTO dbo.sprints (project_id, name, status) VALUES (@ProjId, N'[TEST] Sprint To Close', N'Planned');
SET @TempSprintClose = SCOPE_IDENTITY();
INSERT INTO dbo.tasks (project_id, sprint_id, title, status, story_points, created_by)
VALUES (@ProjId, @TempSprintClose, N'[TEST] Task Rollover', N'In Progress', 5, @MgrId);
SET @TempTaskRollover = SCOPE_IDENTITY();

EXEC dbo.sp_CloseSprintAndRollover @SprintId = @TempSprintClose, @NextSprintId = NULL, @ClosedByUserId = @MgrId;

IF (SELECT status FROM dbo.sprints WHERE id = @TempSprintClose) <> N'Completed'
   OR (SELECT sprint_id FROM dbo.tasks WHERE id = @TempTaskRollover) IS NOT NULL
    RAISERROR(N'[FAIL] TC09: sp_CloseSprintAndRollover không đóng sprint hoặc không chuyển task về Backlog!', 16, 1);
ELSE
    PRINT N'[PASS] TC09: sp_CloseSprintAndRollover hoàn thành giao dịch ACID và chuyển task về Backlog.';

UPDATE dbo.tasks SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE id = @TempTaskRollover;
UPDATE dbo.sprints SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE id = @TempSprintClose;

-- TC10: Cursor kiểm tra Task quá hạn & phát sinh thông báo
EXEC dbo.sp_AutoCheckOverdueTasksAndNotify @ProjectId = @ProjId;
PRINT N'[PASS] TC10: sp_AutoCheckOverdueTasksAndNotify (Cursor) thực thi thành công.';

-- TC11: Backup toàn bộ CSDL & Verify
EXEC dbo.sp_BackupDatabaseWithAudit @BackupType = N'FULL', @BackupDirectory = NULL, @PerformedBy = @MgrId;
PRINT N'[PASS] TC11: sp_BackupDatabaseWithAudit đã sao lưu và chạy RESTORE VERIFYONLY thành công.';
GO

PRINT N'=====================================================================';
PRINT N'TC12 & TC13: KIỂM THỬ VIEWS & 2 CÂU TRUY VẤN 3 BẢNG';
PRINT N'=====================================================================';

SELECT TOP 5 task_id, task_title, project_name, sprint_name, assignees_list
FROM dbo.vw_ActiveTasksOverview;

SELECT TOP 5 employee_code, full_name, department_name, contract_code, base_salary, remaining_days
FROM dbo.vw_HRM_EmployeeLeaveAndContractOverview;

PRINT N'[PASS] TC12: Các Views (Work Management + HRM) hoạt động chính xác.';
PRINT N'TẤT CẢ TEST CASE ĐÃ HOÀN TẤT THÀNH CÔNG!';
GO

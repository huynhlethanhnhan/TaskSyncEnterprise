-- ============================================================================
-- TaskSyncEnterprise — Master Stored Procedures
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Mục đích: Tối ưu hóa truy vấn tổng hợp, giảm thiểu network round-trip &
--           thực thi các giao dịch nghiệp vụ phức tạp (ACID Transactions)
-- ============================================================================

USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- THỦ TỤC 1: sp_GetProjectOverviewStats
-- Kỹ thuật tối ưu hóa: Conditional Aggregation (Tổng hợp có điều kiện)
-- Vấn đề cũ: Backend phải gửi 6-7 câu lệnh SELECT rời rạc để lấy từng chỉ số:
--             tổng task, task done, task in progress, tổng story points, số thành viên...
-- Giải pháp tối ưu: Gom toàn bộ vào 1 lần quét bảng và 1 round-trip duy nhất.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_GetProjectOverviewStats', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetProjectOverviewStats;
GO

CREATE PROCEDURE dbo.sp_GetProjectOverviewStats
    @ProjectId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra dự án tồn tại và chưa bị xóa mềm
    IF NOT EXISTS (SELECT 1 FROM dbo.projects WHERE id = @ProjectId AND is_deleted = 0)
    BEGIN
        RAISERROR(N'Dự án không tồn tại hoặc đã bị xóa.', 16, 1);
        RETURN;
    END;

    -- 1. Thống kê tổng hợp công việc (Single-pass aggregation)
    SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.project_code,
        p.status AS project_status,
        
        -- Số lượng công việc theo trạng thái
        COUNT(t.id) AS total_tasks,
        COUNT(CASE WHEN t.status = N'Done' THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN t.status = N'In Progress' THEN 1 END) AS in_progress_tasks,
        COUNT(CASE WHEN t.status = N'Review' THEN 1 END) AS review_tasks,
        COUNT(CASE WHEN t.status = N'To Do' THEN 1 END) AS todo_tasks,
        
        -- Công việc quá hạn (Overdue)
        COUNT(CASE 
            WHEN t.deadline < SYSUTCDATETIME() AND t.status <> N'Done' 
            THEN 1 
        END) AS overdue_tasks,

        -- Story points
        ISNULL(SUM(t.story_points), 0) AS total_story_points,
        ISNULL(SUM(CASE WHEN t.status = N'Done' THEN t.story_points ELSE 0 END), 0) AS completed_story_points,

        -- Tiến độ phần trăm trung bình
        CAST(
            CASE 
                WHEN COUNT(t.id) = 0 THEN 0.00
                ELSE AVG(CAST(t.progress_percent AS DECIMAL(5,2)))
            END AS DECIMAL(5,2)
        ) AS average_progress_percent,

        -- Số lượng thành viên
        (
            SELECT COUNT(*) 
            FROM dbo.project_members pm 
            WHERE pm.project_id = p.id
        ) AS member_count,

        -- Số lượng Sprint
        (
            SELECT COUNT(*) 
            FROM dbo.sprints s 
            WHERE s.project_id = p.id AND s.is_deleted = 0
        ) AS total_sprints

    FROM dbo.projects p
    LEFT JOIN dbo.tasks t 
        ON t.project_id = p.id 
       AND t.is_deleted = 0
    WHERE p.id = @ProjectId
    GROUP BY 
        p.id, 
        p.name, 
        p.project_code, 
        p.status;
END;
GO

-- ============================================================================
-- THỦ TỤC 2: sp_GetSprintBurndownReport
-- Kỹ thuật tối ưu hóa: Lấy toàn bộ chuỗi số liệu Burndown Chart của Sprint
-- Kết hợp dữ liệu lịch sử (sprint_snapshots) và dữ liệu thời gian thực (tasks)
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_GetSprintBurndownReport', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_GetSprintBurndownReport;
GO

CREATE PROCEDURE dbo.sp_GetSprintBurndownReport
    @SprintId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Kết quả 1: Thông tin tổng quan Sprint
    SELECT 
        s.id AS sprint_id,
        s.name AS sprint_name,
        s.goal,
        s.start_date,
        s.end_date,
        s.status,
        s.capacity,
        ISNULL(SUM(t.story_points), 0) AS initial_committed_points,
        COUNT(t.id) AS total_tasks,
        COUNT(CASE WHEN t.status = N'Done' THEN 1 END) AS completed_tasks
    FROM dbo.sprints s
    LEFT JOIN dbo.tasks t ON t.sprint_id = s.id AND t.is_deleted = 0
    WHERE s.id = @SprintId AND s.is_deleted = 0
    GROUP BY 
        s.id, s.name, s.goal, s.start_date, s.end_date, s.status, s.capacity;

    -- Kết quả 2: Chuỗi snapshot từng ngày phục vụ vẽ biểu đồ Burndown
    SELECT 
        snapshot_date,
        remaining_story_points,
        completed_story_points,
        remaining_tasks,
        completed_tasks
    FROM dbo.sprint_snapshots
    WHERE sprint_id = @SprintId
    ORDER BY snapshot_date ASC;
END;
GO

-- ============================================================================
-- THỦ TỤC 3: sp_CloseSprintAndRollover
-- Kỹ thuật: Đảm bảo tính toàn vẹn giao dịch (ACID Transaction)
-- Nghiệp vụ Agile: Khi kết thúc một Sprint:
--   1. Đổi trạng thái sprint thành 'Completed'.
--   2. Chụp lại snapshot ngày cuối cùng của Sprint.
--   3. Các task chưa hoàn thành (status <> 'Done') được tự động chuyển sang
--      Sprint kế tiếp (nếu có chỉ định) hoặc đưa về Backlog (sprint_id = NULL).
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_CloseSprintAndRollover', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CloseSprintAndRollover;
GO

CREATE PROCEDURE dbo.sp_CloseSprintAndRollover
    @SprintId INT,
    @NextSprintId INT = NULL,
    @ClosedByUserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- Tự động rollback nếu có lỗi ngoại lệ

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Kiểm tra Sprint tồn tại
        IF NOT EXISTS (SELECT 1 FROM dbo.sprints WHERE id = @SprintId AND is_deleted = 0)
        BEGIN
            RAISERROR(N'Sprint không tồn tại hoặc đã bị xóa.', 16, 1);
        END;

        -- 2. Kiểm tra NextSprintId nếu có truyền vào
        IF @NextSprintId IS NOT NULL
        BEGIN
            DECLARE @CurrentProjectId INT;
            SELECT @CurrentProjectId = project_id FROM dbo.sprints WHERE id = @SprintId;

            IF NOT EXISTS (
                SELECT 1 
                FROM dbo.sprints 
                WHERE id = @NextSprintId 
                  AND project_id = @CurrentProjectId 
                  AND is_deleted = 0
            )
            BEGIN
                RAISERROR(N'Sprint kế tiếp không hợp lệ hoặc không thuộc cùng dự án.', 16, 1);
            END;
        END;

        -- 3. Cập nhật trạng thái Sprint hiện tại thành Completed
        UPDATE dbo.sprints
        SET 
            status = N'Completed',
            updated_at = SYSUTCDATETIME(),
            updated_by_id = @ClosedByUserId
        WHERE id = @SprintId;

        -- 4. Chụp snapshot đóng Sprint
        DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);
        
        MERGE dbo.sprint_snapshots AS target
        USING (
            SELECT 
                @SprintId AS sprint_id,
                @Today AS snapshot_date,
                ISNULL(SUM(CASE WHEN status <> N'Done' THEN story_points ELSE 0 END), 0) AS remaining_sp,
                ISNULL(SUM(CASE WHEN status = N'Done' THEN story_points ELSE 0 END), 0) AS completed_sp,
                COUNT(CASE WHEN status <> N'Done' THEN 1 END) AS remaining_tasks,
                COUNT(CASE WHEN status = N'Done' THEN 1 END) AS completed_tasks
            FROM dbo.tasks
            WHERE sprint_id = @SprintId AND is_deleted = 0
        ) AS source
        ON (target.sprint_id = source.sprint_id AND target.snapshot_date = source.snapshot_date)
        WHEN MATCHED THEN
            UPDATE SET 
                remaining_story_points = source.remaining_sp,
                completed_story_points = source.completed_sp,
                remaining_tasks = source.remaining_tasks,
                completed_tasks = source.completed_tasks
        WHEN NOT MATCHED THEN
            INSERT (sprint_id, snapshot_date, remaining_story_points, completed_story_points, remaining_tasks, completed_tasks)
            VALUES (source.sprint_id, source.snapshot_date, source.remaining_sp, source.completed_sp, source.remaining_tasks, source.completed_tasks);

        -- 5. Di chuyển các Task chưa hoàn thành
        UPDATE dbo.tasks
        SET 
            sprint_id = @NextSprintId,
            updated_at = SYSUTCDATETIME(),
            updated_by_id = @ClosedByUserId
        WHERE sprint_id = @SprintId 
          AND status <> N'Done' 
          AND is_deleted = 0;

        DECLARE @MovedCount INT = @@ROWCOUNT;

        -- 6. Ghi vết audit log
        INSERT INTO dbo.audit_logs (
            employee_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            timestamp
        )
        VALUES (
            @ClosedByUserId,
            N'CLOSE_SPRINT',
            N'Sprint',
            @SprintId,
            N'Status: Active',
            N'Status: Completed | Incomplete Tasks Moved: ' + CAST(@MovedCount AS NVARCHAR(10)),
            SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT 
            @SprintId AS closed_sprint_id,
            @NextSprintId AS target_sprint_id,
            @MovedCount AS incomplete_tasks_moved,
            N'Đóng Sprint thành công và chuyển công việc dang dở.' AS message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH;
END;
GO

-- ============================================================================
-- THỦ TỤC 4 (ÁP DỤNG CURSOR): sp_AutoCheckOverdueTasksAndNotify
-- Kỹ thuật: CURSOR LOCAL FAST_FORWARD + Transaction Batching
-- Nghiệp vụ: Quét các công việc quá hạn (deadline < SYSUTCDATETIME(), chưa Done),
--            duyệt từng cặp (Task - Assignee) để chèn thông báo nhắc việc tự động
--            vào bảng dbo.notifications (tránh gửi trùng trong cùng một ngày).
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_AutoCheckOverdueTasksAndNotify', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_AutoCheckOverdueTasksAndNotify;
GO

CREATE PROCEDURE dbo.sp_AutoCheckOverdueTasksAndNotify
    @ProjectId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @TaskId INT,
        @TaskTitle NVARCHAR(200),
        @ProjectName NVARCHAR(255),
        @EmpId INT,
        @Deadline DATETIME2(7),
        @NotifiedCount INT = 0,
        @Today DATE = CAST(SYSUTCDATETIME() AS DATE);

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE cur_overdue CURSOR LOCAL FAST_FORWARD FOR
            SELECT
                t.id,
                t.title,
                p.name,
                ta.employee_id,
                t.deadline
            FROM dbo.tasks t
            INNER JOIN dbo.projects p ON t.project_id = p.id
            INNER JOIN dbo.task_assignments ta ON ta.task_id = t.id
            INNER JOIN dbo.employees e ON ta.employee_id = e.id
            WHERE t.is_deleted = 0
              AND p.is_deleted = 0
              AND e.is_deleted = 0
              AND e.is_active = 1
              AND t.status <> N'Done'
              AND t.deadline IS NOT NULL
              AND t.deadline < SYSUTCDATETIME()
              AND (@ProjectId IS NULL OR t.project_id = @ProjectId);

        OPEN cur_overdue;
        FETCH NEXT FROM cur_overdue INTO @TaskId, @TaskTitle, @ProjectName, @EmpId, @Deadline;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE @EventKey NVARCHAR(100) = N'OVERDUE_TASK_' + CAST(@TaskId AS NVARCHAR(20)) + N'_' + CONVERT(NVARCHAR(10), @Today, 23);

            IF NOT EXISTS (
                SELECT 1
                FROM dbo.notifications
                WHERE employee_id = @EmpId
                  AND event_id = @EventKey
            )
            BEGIN
                INSERT INTO dbo.notifications (
                    employee_id, event_id, type, title, message, priority, status, channel, created_at
                )
                VALUES (
                    @EmpId,
                    @EventKey,
                    N'TASK_OVERDUE',
                    N'Nhắc việc quá hạn: ' + @TaskTitle,
                    N'Công việc "' + @TaskTitle + N'" thuộc dự án "' + @ProjectName + N'" đã quá hạn vào ' + CONVERT(NVARCHAR(19), @Deadline, 120) + N' UTC.',
                    N'HIGH',
                    N'PENDING',
                    N'IN_APP',
                    SYSUTCDATETIME()
                );

                SET @NotifiedCount = @NotifiedCount + 1;
            END;

            FETCH NEXT FROM cur_overdue INTO @TaskId, @TaskTitle, @ProjectName, @EmpId, @Deadline;
        END;

        CLOSE cur_overdue;
        DEALLOCATE cur_overdue;

        COMMIT TRANSACTION;

        SELECT
            @NotifiedCount AS notifications_created,
            @ProjectId AS filtered_project_id,
            SYSUTCDATETIME() AS checked_at_utc;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('local', 'cur_overdue') >= -1
        BEGIN
            CLOSE cur_overdue;
            DEALLOCATE cur_overdue;
        END;

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH;
END;
GO

-- ============================================================================
-- THỦ TỤC 5 (ROLLBACK / RESTORE DỮ LIỆU): sp_RollbackTaskFromAudit
-- Kỹ thuật: SAVE TRANSACTION (Savepoint) + Transaction Rollback + Audit Recovery
-- Nghiệp vụ: Cho phép DBA / Admin phục hồi (Rollback) một Task:
--   - Chế độ 'RESTORE_SOFT_DELETE': Khôi phục bản ghi đã xóa mềm (is_deleted = 1 -> 0).
--   - Chế độ 'REVERT_LAST_STATUS': Đọc trạng thái cũ từ audit_logs và trả Task về trạng thái trước.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_RollbackTaskFromAudit', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_RollbackTaskFromAudit;
GO

CREATE PROCEDURE dbo.sp_RollbackTaskFromAudit
    @TaskId INT,
    @ActionMode NVARCHAR(30) = N'RESTORE_SOFT_DELETE',
    @PerformedBy INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.tasks WHERE id = @TaskId)
    BEGIN
        RAISERROR(N'Không tìm thấy Task có ID = %d.', 16, 1, @TaskId);
        RETURN;
    END;

    IF @ActionMode NOT IN (N'RESTORE_SOFT_DELETE', N'REVERT_LAST_STATUS')
    BEGIN
        RAISERROR(N'ActionMode không hợp lệ. Chỉ chấp nhận RESTORE_SOFT_DELETE hoặc REVERT_LAST_STATUS.', 16, 1);
        RETURN;
    END;

    BEGIN TRANSACTION;
    SAVE TRANSACTION SavePoint_BeforeTaskRollback;

    BEGIN TRY
        DECLARE @CurrentStatus NVARCHAR(30);
        DECLARE @CurrentDeleted BIT;

        SELECT @CurrentStatus = status, @CurrentDeleted = is_deleted
        FROM dbo.tasks
        WHERE id = @TaskId;

        IF @ActionMode = N'RESTORE_SOFT_DELETE'
        BEGIN
            IF @CurrentDeleted = 0
            BEGIN
                RAISERROR(N'Task này đang hoạt động (is_deleted = 0), không cần phục hồi xóa mềm.', 16, 1);
            END;

            UPDATE dbo.tasks
            SET
                is_deleted = 0,
                deleted_at = NULL,
                deleted_by_id = NULL,
                updated_at = SYSUTCDATETIME(),
                updated_by_id = @PerformedBy
            WHERE id = @TaskId;

            INSERT INTO dbo.audit_logs (employee_id, action, entity_type, entity_id, old_values, new_values, timestamp)
            VALUES (
                @PerformedBy,
                N'ROLLBACK_SOFT_DELETE_TASK',
                N'Task',
                @TaskId,
                N'is_deleted = 1',
                N'is_deleted = 0 | Restored via sp_RollbackTaskFromAudit',
                SYSUTCDATETIME()
            );
        END
        ELSE IF @ActionMode = N'REVERT_LAST_STATUS'
        BEGIN
            DECLARE @LastOldValues NVARCHAR(MAX);
            SELECT TOP 1 @LastOldValues = old_values
            FROM dbo.audit_logs
            WHERE entity_type = N'Task'
              AND entity_id = @TaskId
              AND action = N'UPDATE_TASK_DETAILS'
            ORDER BY id DESC;

            IF @LastOldValues IS NULL
            BEGIN
                RAISERROR(N'Không có lịch sử UPDATE_TASK_DETAILS trong audit_logs để rollback.', 16, 1);
            END;

            -- Trích xuất lại Status từ chuỗi 'Status: <val>, Priority: ...'
            DECLARE @StatusStart INT = CHARINDEX(N'Status: ', @LastOldValues);
            DECLARE @PriorityPos INT = CHARINDEX(N', Priority: ', @LastOldValues);
            DECLARE @RestoredStatus NVARCHAR(30) = NULL;

            IF @StatusStart > 0 AND @PriorityPos > @StatusStart
            BEGIN
                SET @RestoredStatus = LTRIM(RTRIM(SUBSTRING(@LastOldValues, @StatusStart + 8, @PriorityPos - (@StatusStart + 8))));
            END;

            IF @RestoredStatus IS NULL OR @RestoredStatus NOT IN (N'To Do', N'In Progress', N'Review', N'Done')
            BEGIN
                RAISERROR(N'Không thể phân tích trạng thái cũ hợp lệ từ nhật ký kiểm toán.', 16, 1);
            END;

            UPDATE dbo.tasks
            SET
                status = @RestoredStatus,
                updated_at = SYSUTCDATETIME(),
                updated_by_id = @PerformedBy
            WHERE id = @TaskId;

            INSERT INTO dbo.audit_logs (employee_id, action, entity_type, entity_id, old_values, new_values, timestamp)
            VALUES (
                @PerformedBy,
                N'ROLLBACK_TASK_STATUS',
                N'Task',
                @TaskId,
                N'Status: ' + @CurrentStatus,
                N'Status: ' + @RestoredStatus + N' | Reverted from audit_logs',
                SYSUTCDATETIME()
            );
        END;

        INSERT INTO dbo.backup_history_logs (backup_type, database_name, backup_path, status, performed_by, notes)
        VALUES (
            N'LOGICAL_ROLLBACK',
            DB_NAME(),
            N'dbo.tasks#' + CAST(@TaskId AS NVARCHAR(20)),
            N'RESTORED',
            @PerformedBy,
            N'Logical rollback mode: ' + @ActionMode
        );

        COMMIT TRANSACTION;

        SELECT
            id AS task_id,
            title,
            status,
            is_deleted,
            updated_at,
            N'Phục hồi dữ liệu Task thành công.' AS message
        FROM dbo.tasks
        WHERE id = @TaskId;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() = 1
            ROLLBACK TRANSACTION SavePoint_BeforeTaskRollback;
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH;
END;
GO

-- ============================================================================
-- THỦ TỤC 6 (BACKUP & VERIFY): sp_BackupDatabaseWithAudit
-- Kỹ thuật: BACKUP DATABASE (FULL / DIFFERENTIAL) + RESTORE VERIFYONLY + Audit
-- Nghiệp vụ: Tự động sao lưu toàn bộ CSDL ra file .bak, kiểm tra tính toàn vẹn
--            của bản backup và ghi lịch sử vào dbo.backup_history_logs.
-- ============================================================================
IF OBJECT_ID(N'dbo.sp_BackupDatabaseWithAudit', N'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_BackupDatabaseWithAudit;
GO

CREATE PROCEDURE dbo.sp_BackupDatabaseWithAudit
    @BackupType NVARCHAR(20) = N'FULL',
    @BackupDirectory NVARCHAR(400) = NULL,
    @PerformedBy INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @BackupType NOT IN (N'FULL', N'DIFFERENTIAL')
    BEGIN
        RAISERROR(N'BackupType chỉ hỗ trợ FULL hoặc DIFFERENTIAL.', 16, 1);
        RETURN;
    END;

    DECLARE @DbName SYSNAME = DB_NAME();
    DECLARE @DefaultDir NVARCHAR(400) = CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS NVARCHAR(400));
    DECLARE @TargetDir NVARCHAR(400) = COALESCE(NULLIF(LTRIM(RTRIM(@BackupDirectory)), N''), @DefaultDir);
    DECLARE @Sep NVARCHAR(1) = CASE WHEN CHARINDEX(N'/', @TargetDir) > 0 THEN N'/' ELSE N'\' END;

    IF RIGHT(@TargetDir, 1) NOT IN (N'\', N'/')
        SET @TargetDir = @TargetDir + @Sep;

    DECLARE @Timestamp NVARCHAR(20) = REPLACE(REPLACE(REPLACE(CONVERT(NVARCHAR(19), SYSUTCDATETIME(), 120), N'-', N''), N' ', N'_'), N':', N'');
    DECLARE @BackupFile NVARCHAR(500) = @TargetDir + @DbName + N'_' + @BackupType + N'_' + @Timestamp + N'.bak';

    BEGIN TRY
        IF @BackupType = N'FULL'
        BEGIN
            BACKUP DATABASE @DbName
            TO DISK = @BackupFile
            WITH INIT, CHECKSUM, NAME = N'TaskSyncEnterprise Full Backup';
        END
        ELSE
        BEGIN
            BACKUP DATABASE @DbName
            TO DISK = @BackupFile
            WITH DIFFERENTIAL, INIT, CHECKSUM, NAME = N'TaskSyncEnterprise Differential Backup';
        END;

        RESTORE VERIFYONLY FROM DISK = @BackupFile WITH CHECKSUM;

        INSERT INTO dbo.backup_history_logs (backup_type, database_name, backup_path, status, performed_by, notes)
        VALUES (@BackupType, @DbName, @BackupFile, N'VERIFIED', @PerformedBy, N'Backup & RESTORE VERIFYONLY passed.');

        SELECT
            @DbName AS database_name,
            @BackupType AS backup_type,
            @BackupFile AS backup_file,
            N'VERIFIED' AS status;
    END TRY
    BEGIN CATCH
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();

        INSERT INTO dbo.backup_history_logs (backup_type, database_name, backup_path, status, performed_by, notes)
        VALUES (@BackupType, @DbName, @BackupFile, N'FAILED', @PerformedBy, LEFT(@Err, 500));

        RAISERROR(@Err, 16, 1);
    END CATCH;
END;
GO

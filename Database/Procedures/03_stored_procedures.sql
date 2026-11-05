-- ============================================================================
-- TaskSyncEnterprise — Master Stored Procedures
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Mục đích: Tối ưu hóa truy vấn tổng hợp, giảm thiểu network round-trip &
--           thực thi các giao dịch nghiệp vụ phức tạp (ACID Transactions)
-- ============================================================================

USE TaskSyncEnterprise;
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

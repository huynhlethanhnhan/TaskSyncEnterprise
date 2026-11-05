-- ============================================================================
-- TaskSyncEnterprise — Kịch Bản Demo & Kiểm Thử Dành Cho Báo Cáo
-- Hướng dẫn: Mở SQL Server Management Studio (SSMS), kết nối CSDL TaskSyncEnterprise,
--            và chạy từng phần (bôi đen từng khối lệnh rồi nhấn F5).
-- ============================================================================

IF DB_NAME() = N'master'
    USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT N'=====================================================================';
PRINT N'DEMO 1: KIỂM THỬ TRIGGER AUDIT TRAIL TỰ ĐỘNG GHI VẾT (trg_Tasks_AuditTrail)';
PRINT N'=====================================================================';

-- 1. Xem nhật ký hiện tại
SELECT TOP 5 id, action, entity_type, entity_id, old_values, new_values, timestamp 
FROM dbo.audit_logs 
ORDER BY id DESC;

-- 2. Cập nhật trạng thái và tiến độ của một công việc đang làm (chuyển sang Review, tiến độ 95%)
DECLARE @TaskId INT = (SELECT TOP 1 id FROM dbo.tasks WHERE is_deleted = 0 AND status = N'In Progress');
IF @TaskId IS NULL 
    SELECT TOP 1 @TaskId = id FROM dbo.tasks WHERE is_deleted = 0;

IF @TaskId IS NOT NULL
BEGIN
    UPDATE dbo.tasks
    SET 
        status = N'Review',
        progress_percent = 95.00,
        updated_by_id = (SELECT TOP 1 id FROM dbo.employees WHERE is_deleted = 0)
    WHERE id = @TaskId;

    -- 3. Kiểm tra xem Trigger có tự động ghi vết thay đổi vào audit_logs không
    SELECT TOP 1 id, action, entity_type, entity_id, old_values, new_values, timestamp 
    FROM dbo.audit_logs 
    ORDER BY id DESC;
END;
GO


PRINT N'=====================================================================';
PRINT N'DEMO 2: KIỂM THỬ TRIGGER INSTEAD OF CHẶN XÓA CỨNG (trg_Tasks_SoftDelete_InsteadOf)';
PRINT N'=====================================================================';

-- 1. Lấy một công việc đang hoạt động
DECLARE @TaskId INT = (SELECT TOP 1 id FROM dbo.tasks WHERE is_deleted = 0 AND status = N'To Do');
IF @TaskId IS NULL
    SELECT TOP 1 @TaskId = id FROM dbo.tasks WHERE is_deleted = 0;

IF @TaskId IS NOT NULL
BEGIN
    -- Xem trạng thái ban đầu
    SELECT id, title, is_deleted, deleted_at FROM dbo.tasks WHERE id = @TaskId;

    -- Người dùng/DBA chạy câu lệnh DELETE FROM vật lý trong SSMS
    DELETE FROM dbo.tasks WHERE id = @TaskId;

    -- Kiểm tra lại: Dòng dữ liệu KHÔNG bị mất khỏi bảng, mà is_deleted chuyển thành 1!
    SELECT id, title, is_deleted, deleted_at FROM dbo.tasks WHERE id = @TaskId;

    -- Kiểm tra nhật ký audit_logs ghi nhận hành động xóa mềm
    SELECT TOP 1 action, entity_type, entity_id, new_values, timestamp 
    FROM dbo.audit_logs 
    ORDER BY id DESC;
END;
GO


PRINT N'=====================================================================';
PRINT N'DEMO 3: KIỂM THỬ TRIGGER CHẶN 2 SPRINT ACTIVE CÙNG DỰ ÁN (trg_Sprints_ActiveSprintConstraint)';
PRINT N'=====================================================================';

-- Tìm một Sprint đang ở trạng thái 'Planned' thuộc dự án đã có Sprint 'Active'
DECLARE @PlannedSprintId INT = (
    SELECT TOP 1 s_planned.id
    FROM dbo.sprints s_planned
    INNER JOIN dbo.sprints s_active ON s_planned.project_id = s_active.project_id
    WHERE s_planned.status = N'Planned' 
      AND s_active.status = N'Active' 
      AND s_planned.is_deleted = 0 
      AND s_active.is_deleted = 0
);

IF @PlannedSprintId IS NOT NULL
BEGIN
    BEGIN TRY
        UPDATE dbo.sprints
        SET status = N'Active'
        WHERE id = @PlannedSprintId;
        
        PRINT N'LỖI: Trigger không chặn được vi phạm!';
    END TRY
    BEGIN CATCH
        PRINT N'THÀNH CÔNG: Trigger đã chặn đứng vi phạm nghiệp vụ!';
        PRINT N'Mã lỗi: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT N'Thông điệp lỗi: ' + ERROR_MESSAGE();
    END CATCH;
END;
GO


PRINT N'=====================================================================';
PRINT N'DEMO 4: KIỂM THỬ STORED PROCEDURE TỔNG HỢP DỮ LIỆU TỐI ƯU (sp_GetProjectOverviewStats)';
PRINT N'=====================================================================';

DECLARE @DemoProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE is_deleted = 0);

IF @DemoProjectId IS NOT NULL
BEGIN
    EXEC dbo.sp_GetProjectOverviewStats @ProjectId = @DemoProjectId;
END;
GO


PRINT N'=====================================================================';
PRINT N'DEMO 5: KIỂM THỬ VIEW TOÀN CỤC ÁP DỤNG XÓA MỀM (vw_ActiveTasksOverview)';
PRINT N'=====================================================================';

DECLARE @DemoProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE is_deleted = 0);

IF @DemoProjectId IS NOT NULL
BEGIN
    SELECT 
        task_id,
        task_title,
        priority,
        status,
        progress_percent,
        project_name,
        sprint_name,
        creator_name,
        assignees_list,
        is_overdue
    FROM dbo.vw_ActiveTasksOverview
    WHERE project_id = @DemoProjectId;
END;
GO


PRINT N'=====================================================================';
PRINT N'DEMO 6: ĐO LƯỜNG HIỆU NĂNG TRUY VẤN CÓ INDEX (SET STATISTICS IO / TIME)';
PRINT N'=====================================================================';

SET STATISTICS IO ON;
SET STATISTICS TIME ON;

DECLARE @DemoProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE is_deleted = 0);

IF @DemoProjectId IS NOT NULL
BEGIN
    SELECT 
        title, 
        status, 
        priority, 
        deadline, 
        progress_percent
    FROM dbo.tasks
    WHERE project_id = @DemoProjectId AND is_deleted = 0;
END;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
GO

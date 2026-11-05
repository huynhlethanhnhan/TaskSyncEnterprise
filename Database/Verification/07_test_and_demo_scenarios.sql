-- ============================================================================
-- TaskSyncEnterprise — Kịch Bản Demo & Kiểm Thử Dành Cho Báo Cáo
-- Hướng dẫn: Mở SQL Server Management Studio (SSMS), kết nối CSDL TaskSyncEnterprise,
--            và chạy từng phần (bôi đen từng khối lệnh rồi nhấn F5).
-- ============================================================================

USE TaskSyncEnterprise;
GO

PRINT N'=====================================================================';
PRINT N'DEMO 1: KIỂM THỬ TRIGGER AUDIT TRAIL TỰ ĐỘNG GHI VẾT (trg_Tasks_AuditTrail)';
PRINT N'=====================================================================';

-- 1. Xem nhật ký hiện tại
SELECT TOP 5 id, action, entity_type, entity_id, old_values, new_values, timestamp 
FROM dbo.audit_logs 
ORDER BY id DESC;

-- 2. Cập nhật trạng thái và tiến độ của Task 2 (từ In Progress lên Review, tiến độ 95%)
UPDATE dbo.tasks
SET 
    status = N'Review',
    progress_percent = 95.00,
    updated_by_id = 3
WHERE id = 2;

-- 3. Kiểm tra xem Trigger có tự động ghi vết thay đổi vào audit_logs không
SELECT TOP 1 id, action, entity_type, entity_id, old_values, new_values, timestamp 
FROM dbo.audit_logs 
ORDER BY id DESC;
-- KẾT QUẢ KỲ VỌNG: Có 1 dòng mới với action 'UPDATE_TASK_DETAILS', 
-- ghi rõ old_values: Status: In Progress, Progress: 75% -> new_values: Status: Review, Progress: 95%
GO


PRINT N'=====================================================================';
PRINT N'DEMO 2: KIỂM THỬ TRIGGER INSTEAD OF CHẶN XÓA CỨNG (trg_Tasks_SoftDelete_InsteadOf)';
PRINT N'=====================================================================';

-- 1. Xem trạng thái ban đầu của Task 3
SELECT id, title, is_deleted, deleted_at FROM dbo.tasks WHERE id = 3;

-- 2. Người dùng/DBA chạy câu lệnh DELETE FROM vật lý trong SSMS
DELETE FROM dbo.tasks WHERE id = 3;

-- 3. Kiểm tra lại: Dòng dữ liệu KHÔNG bị mất khỏi bảng, mà is_deleted chuyển thành 1!
SELECT id, title, is_deleted, deleted_at FROM dbo.tasks WHERE id = 3;

-- 4. Kiểm tra nhật ký audit_logs ghi nhận hành động xóa mềm
SELECT TOP 1 action, entity_type, entity_id, new_values, timestamp 
FROM dbo.audit_logs 
ORDER BY id DESC;
-- KẾT QUẢ KỲ VỌNG: is_deleted = 1, deleted_at có timestamp hiện tại.
GO


PRINT N'=====================================================================';
PRINT N'DEMO 3: KIỂM THỬ TRIGGER CHẶN 2 SPRINT ACTIVE CÙNG DỰ ÁN (trg_Sprints_ActiveSprintConstraint)';
PRINT N'=====================================================================';

-- Dự án 1 hiện đang có Sprint 1 ở trạng thái 'Active'.
-- Bây giờ ta cố tình kích hoạt thêm Sprint 2 thành 'Active':
BEGIN TRY
    UPDATE dbo.sprints
    SET status = N'Active'
    WHERE id = 2;
    
    PRINT N'LỖI: Trigger không chặn được vi phạm!';
END TRY
BEGIN CATCH
    PRINT N'THÀNH CÔNG: Trigger đã chặn đứng vi phạm nghiệp vụ!';
    PRINT N'Mã lỗi: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
    PRINT N'Thông điệp lỗi: ' + ERROR_MESSAGE();
END CATCH;
-- KẾT QUẢ KỲ VỌNG: Bắt được lỗi 'Lỗi vi phạm quy tắc Agile: Dự án chỉ được phép có duy nhất 1 Sprint Active...'
GO


PRINT N'=====================================================================';
PRINT N'DEMO 4: KIỂM THỬ STORED PROCEDURE TỔNG HỢP DỮ LIỆU TỐI ƯU (sp_GetProjectOverviewStats)';
PRINT N'=====================================================================';

-- Chạy thủ tục thống kê tổng quan cho Dự án 1 chỉ với 1 dòng lệnh duy nhất:
EXEC dbo.sp_GetProjectOverviewStats @ProjectId = 1;
-- KẾT QUẢ KỲ VỌNG: Trả về đầy đủ: total_tasks, completed_tasks, overdue_tasks, 
-- story_points, average_progress_percent, member_count... chỉ trong 1 round-trip!
GO


PRINT N'=====================================================================';
PRINT N'DEMO 5: KIỂM THỬ VIEW TOÀN CỤC ÁP DỤNG XÓA MỀM (vw_ActiveTasksOverview)';
PRINT N'=====================================================================';

-- Truy vấn dữ liệu qua View:
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
WHERE project_id = 1;
-- KẾT QUẢ KỲ VỌNG: Task số 3 (đã bị xóa mềm ở Demo 2) tự động KHÔNG XUẤT HIỆN trong kết quả!
GO


PRINT N'=====================================================================';
PRINT N'DEMO 6: ĐO LƯỜNG HIỆU NĂNG TRUY VẤN CÓ INDEX (SET STATISTICS IO / TIME)';
PRINT N'=====================================================================';

SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- Truy vấn tìm kiếm các công việc trong dự án có thời hạn
SELECT 
    title, 
    status, 
    priority, 
    deadline, 
    progress_percent
FROM dbo.tasks
WHERE project_id = 1 AND is_deleted = 0;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
-- KẾT QUẢ KỲ VỌNG: Trong tab Messages của SSMS, Logical Reads cực nhỏ (1-3 reads), 
-- Execution time < 1ms nhờ tận dụng IX_tasks_project_covering (Index Seek).
GO

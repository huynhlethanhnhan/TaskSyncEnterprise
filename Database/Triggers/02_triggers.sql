-- ============================================================================
-- TaskSyncEnterprise — Master T-SQL Triggers
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Mục đích: Đảm bảo toàn vẹn dữ liệu, quy tắc nghiệp vụ tự động & audit trail
-- ============================================================================

USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- TRIGGER 1: INSTEAD OF DELETE — BẢO VỆ NGUYÊN TẮC XÓA MỀM (SOFT DELETION)
-- Nghiệp vụ: Tuyệt đối không cho phép xóa vật lý (hard delete) bản ghi Task.
-- Khi có lệnh DELETE FROM dbo.tasks, trigger tự động chuyển đổi thành
-- UPDATE is_deleted = 1, deleted_at = SYSUTCDATETIME().
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_Tasks_SoftDelete_InsteadOf', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Tasks_SoftDelete_InsteadOf;
GO

CREATE TRIGGER dbo.trg_Tasks_SoftDelete_InsteadOf
ON dbo.tasks
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Cập nhật trạng thái xóa mềm
    UPDATE t
    SET 
        t.is_deleted = 1,
        t.deleted_at = SYSUTCDATETIME()
    FROM dbo.tasks t
    INNER JOIN deleted d ON t.id = d.id;

    -- 2. Tự động ghi vết vào bảng audit_logs
    INSERT INTO dbo.audit_logs (
        employee_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        timestamp
    )
    SELECT 
        d.created_by,
        N'SOFT_DELETE_TASK',
        N'Task',
        d.id,
        N'Title: ' + ISNULL(d.title, N'') + N' | Status: ' + ISNULL(d.status, N''),
        N'is_deleted = 1 | deleted_at = ' + CONVERT(NVARCHAR(30), SYSUTCDATETIME(), 126),
        SYSUTCDATETIME()
    FROM deleted d;
END;
GO

-- ============================================================================
-- TRIGGER 2: AFTER UPDATE — NHẬT KÝ KIỂM TOÁN TỰ ĐỘNG (AUDIT TRAIL)
-- Nghiệp vụ: Khi Task thay đổi trạng thái (status), độ ưu tiên (priority),
-- hoặc tiến độ (progress_percent), tự động ghi vết chi tiết vào audit_logs.
-- Sử dụng 2 bảng ảo inserted và deleted để so sánh giá trị cũ và mới.
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_Tasks_AuditTrail', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Tasks_AuditTrail;
GO

CREATE TRIGGER dbo.trg_Tasks_AuditTrail
ON dbo.tasks
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ ghi nhận audit log nếu có sự thay đổi trên các trường nghiệp vụ quan trọng
    IF UPDATE(status) OR UPDATE(priority) OR UPDATE(progress_percent) OR UPDATE(sprint_id)
    BEGIN
        INSERT INTO dbo.audit_logs (
            employee_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            timestamp
        )
        SELECT 
            i.updated_by_id,
            N'UPDATE_TASK_DETAILS',
            N'Task',
            i.id,
            N'Status: ' + ISNULL(d.status, N'') + 
            N', Priority: ' + ISNULL(d.priority, N'') + 
            N', Progress: ' + CAST(d.progress_percent AS NVARCHAR(10)) + N'%' +
            N', SprintId: ' + CAST(ISNULL(d.sprint_id, 0) AS NVARCHAR(10)),
            N'Status: ' + ISNULL(i.status, N'') + 
            N', Priority: ' + ISNULL(i.priority, N'') + 
            N', Progress: ' + CAST(i.progress_percent AS NVARCHAR(10)) + N'%' +
            N', SprintId: ' + CAST(ISNULL(i.sprint_id, 0) AS NVARCHAR(10)),
            SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON i.id = d.id
        WHERE 
            ISNULL(i.status, N'') <> ISNULL(d.status, N'')
            OR ISNULL(i.priority, N'') <> ISNULL(d.priority, N'')
            OR i.progress_percent <> d.progress_percent
            OR ISNULL(i.sprint_id, 0) <> ISNULL(d.sprint_id, 0);
    END;
END;
GO

-- ============================================================================
-- TRIGGER 3: AFTER INSERT, UPDATE — RÀNG BUỘC DUY NHẤT 1 SPRINT ACTIVE
-- Nghiệp vụ Agile: Mỗi dự án tại một thời điểm chỉ được phép có DUY NHẤT
-- 1 Sprint ở trạng thái Active (và chưa bị xóa mềm).
-- Nếu vi phạm, trigger lập tức ROLLBACK TRANSACTION và ném lỗi nghiệp vụ.
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_Sprints_ActiveSprintConstraint', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Sprints_ActiveSprintConstraint;
GO

CREATE TRIGGER dbo.trg_Sprints_ActiveSprintConstraint
ON dbo.sprints
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(status) OR UPDATE(is_deleted) OR UPDATE(project_id)
    BEGIN
        -- Kiểm tra xem có dự án nào chứa nhiều hơn 1 Sprint Active không
        IF EXISTS (
            SELECT s.project_id
            FROM dbo.sprints s
            WHERE s.status = N'Active' 
              AND s.is_deleted = 0
              AND s.project_id IN (SELECT DISTINCT project_id FROM inserted)
            GROUP BY s.project_id
            HAVING COUNT(*) > 1
        )
        BEGIN
            RAISERROR (
                N'Lỗi vi phạm quy tắc Agile: Dự án chỉ được phép có duy nhất 1 Sprint Active tại một thời điểm.', 
                16, -- Severity Level
                1   -- State
            );
            ROLLBACK TRANSACTION;
            RETURN;
        END;
    END;
END;
GO

-- ============================================================================
-- TRIGGER 4: AFTER INSERT, UPDATE — RÀNG BUỘC TOÀN VẸN TASK VÀ SPRINT
-- Nghiệp vụ: Khi gán Task vào Sprint, bắt buộc Task và Sprint đó phải thuộc
-- về CÙNG MỘT DỰ ÁN (project_id phải trùng nhau).
-- Ngăn ngừa lỗi dữ liệu liên dự án (cross-project contamination).
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_Tasks_ValidateSprintProject', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Tasks_ValidateSprintProject;
GO

CREATE TRIGGER dbo.trg_Tasks_ValidateSprintProject
ON dbo.tasks
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(sprint_id) OR UPDATE(project_id)
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM inserted i
            INNER JOIN dbo.sprints s ON i.sprint_id = s.id
            WHERE i.sprint_id IS NOT NULL 
              AND i.project_id <> s.project_id
        )
        BEGIN
            RAISERROR (
                N'Lỗi toàn vẹn dữ liệu: Task và Sprint được gán phải cùng thuộc một Dự án.', 
                16, 
                1
            );
            ROLLBACK TRANSACTION;
            RETURN;
        END;
    END;
END;
GO

-- ============================================================================
-- TRIGGER 5: AFTER INSERT, UPDATE — RÀNG BUỘC PHÂN CÔNG THÀNH VIÊN DỰ ÁN
-- Nghiệp vụ: Một nhân viên chỉ có thể được giao Task nếu nhân viên đó
-- đã là thành viên chính thức của Dự án (có mặt trong project_members)
-- hoặc là người tạo ra dự án.
-- ============================================================================
IF OBJECT_ID(N'dbo.trg_TaskAssignments_ValidateMember', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_TaskAssignments_ValidateMember;
GO

CREATE TRIGGER dbo.trg_TaskAssignments_ValidateMember
ON dbo.task_assignments
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        INNER JOIN dbo.tasks t ON i.task_id = t.id
        INNER JOIN dbo.projects p ON t.project_id = p.id
        WHERE i.employee_id <> p.created_by
          AND NOT EXISTS (
              SELECT 1 
              FROM dbo.project_members pm 
              WHERE pm.project_id = t.project_id 
                AND pm.employee_id = i.employee_id
          )
    )
    BEGIN
        RAISERROR (
            N'Lỗi phân quyền dữ liệu: Nhân viên chưa tham gia dự án này, không thể phân công thực hiện Task.', 
            16, 
            1
        );
        ROLLBACK TRANSACTION;
        RETURN;
    END;
END;
GO

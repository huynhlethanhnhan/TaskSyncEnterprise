-- ============================================================================
-- TaskSyncEnterprise — Chiến Lược Sao Lưu (Backup) & Phục Hồi (Restore / Rollback)
-- Hệ quản trị CSDL: Microsoft SQL Server 2019 / 2022
-- Mục đích:
--   1. Đảm bảo CSDL dùng mô hình FULL Recovery để có thể phục hồi theo thời điểm (Point-in-Time).
--   2. Cung cấp kịch bản chuẩn cho Full Backup, Differential Backup, Verify Backup.
--   3. Cung cấp kịch bản Database Snapshot để Rollback nhanh trước khi nâng cấp Schema/HRM.
-- ============================================================================

USE master;
GO

-- 1. Đảm bảo chế độ phục hồi FULL (cho phép sao lưu Transaction Log & Point-in-Time Recovery)
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'TaskSyncEnterprise' AND recovery_model_desc <> N'FULL')
BEGIN
    ALTER DATABASE TaskSyncEnterprise SET RECOVERY FULL;
    PRINT N'Đã cấu hình TaskSyncEnterprise sang chế độ RECOVERY FULL.';
END;
GO

-- 2. Gọi Stored Procedure sp_BackupDatabaseWithAudit để thực hiện Full Backup + Verify + Audit Log
USE TaskSyncEnterprise;
GO

IF OBJECT_ID(N'dbo.sp_BackupDatabaseWithAudit', N'P') IS NOT NULL
BEGIN
    EXEC dbo.sp_BackupDatabaseWithAudit
        @BackupType = N'FULL',
        @BackupDirectory = NULL, -- Tự động lấy InstanceDefaultBackupPath của SQL Server
        @PerformedBy = NULL;
END;
GO

-- 3. Xem lịch sử các lần sao lưu & rollback logic đã ghi nhận
SELECT TOP 10
    id,
    backup_type,
    database_name,
    backup_path,
    status,
    performed_by,
    notes,
    created_at
FROM dbo.backup_history_logs
ORDER BY id DESC;
GO

-- ============================================================================
-- 4. MẪU KỊCH BẢN PHỤC HỒI (DISASTER RECOVERY & POINT-IN-TIME ROLLBACK)
-- Lưu ý: Chỉ chạy thủ công khi có sự cố mất dữ liệu hoặc cần rollback toàn CSDL.
-- ============================================================================
/*
USE master;
GO

-- Bước 1: Đưa CSDL về chế độ SINGLE_USER để ngắt kết nối hiện hữu và sao lưu tail-log
ALTER DATABASE TaskSyncEnterprise SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Bước 2: Phục hồi từ bản Full Backup (giữ trạng thái NORECOVERY để nạp tiếp Differential/Log)
RESTORE DATABASE TaskSyncEnterprise
FROM DISK = N'C:\Backup\TaskSyncEnterprise_FULL_20261114.bak'
WITH REPLACE, NORECOVERY;
GO

-- Bước 3 (Tùy chọn): Nạp bản Differential Backup gần nhất
RESTORE DATABASE TaskSyncEnterprise
FROM DISK = N'C:\Backup\TaskSyncEnterprise_DIFF_20261114.bak'
WITH NORECOVERY;
GO

-- Bước 4 (Tùy chọn): Phục hồi đến đúng thời điểm trước khi xóa nhầm dữ liệu (Point-in-Time)
RESTORE LOG TaskSyncEnterprise
FROM DISK = N'C:\Backup\TaskSyncEnterprise_LOG_20261114.trn'
WITH STOPAT = '2026-11-14T10:30:00', RECOVERY;
GO

-- Hoặc hoàn tất mở khóa CSDL nếu không nạp thêm Differential/Log:
RESTORE DATABASE TaskSyncEnterprise WITH RECOVERY;
GO

-- Bước 5: Đưa CSDL trở lại chế độ MULTI_USER cho ứng dụng hoạt động
ALTER DATABASE TaskSyncEnterprise SET MULTI_USER;
GO
*/
GO

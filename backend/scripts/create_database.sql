-- =========================================================================
-- TaskSyncEnterprise Database Creation Script for Local MSSQL Setup
-- Idempotent SQL script to initialize the TaskSyncEnterprise database.
-- =========================================================================

USE master;
GO

IF DB_ID(N'TaskSyncEnterprise') IS NULL
BEGIN
    PRINT N'Creating database [TaskSyncEnterprise]...';
    CREATE DATABASE [TaskSyncEnterprise];
    PRINT N'Database [TaskSyncEnterprise] created successfully.';
END
ELSE
BEGIN
    PRINT N'Database [TaskSyncEnterprise] already exists.';
END;
GO

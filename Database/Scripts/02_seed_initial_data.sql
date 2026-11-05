-- ============================================================================
-- TaskSyncEnterprise — Seed Data Mẫu Chuẩn Cho Demo & Báo Cáo
-- Hệ quản trị CSDL: Microsoft SQL Server
-- ============================================================================

USE TaskSyncEnterprise;
GO

SET NOCOUNT ON;

-- 1. Chèn Vai trò hệ thống
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.roles ON;
    INSERT INTO dbo.roles (id, role_name, description, is_system)
    VALUES 
        (1, N'Admin', N'Quản trị viên toàn hệ thống, có toàn quyền', 1),
        (2, N'Manager', N'Quản lý phòng ban và dự án', 1),
        (3, N'Employee', N'Nhân viên thực hiện công việc', 1);
    SET IDENTITY_INSERT dbo.roles OFF;
END;
GO

-- 2. Chèn Phòng ban
IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.departments ON;
    INSERT INTO dbo.departments (id, department_code, name, description, is_active)
    VALUES 
        (1, N'DEPT-TECH', N'Phòng Kỹ thuật & Công nghệ', N'Phát triển phần mềm, hạ tầng và CSDL', 1),
        (2, N'DEPT-PROD', N'Phòng Sản phẩm & Thiết kế', N'Quản lý sản phẩm, UI/UX và vận hành', 1);
    SET IDENTITY_INSERT dbo.departments OFF;
END;
GO

-- 3. Chèn Đội nhóm
IF NOT EXISTS (SELECT 1 FROM dbo.teams WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.teams ON;
    INSERT INTO dbo.teams (id, department_id, team_code, name, description, is_active)
    VALUES 
        (1, 1, N'TEAM-BACKEND', N'Đội Backend & CSDL', N'Chuyên môn FastAPI, MS SQL Server, Redis', 1),
        (2, 1, N'TEAM-FRONTEND', N'Đội Frontend React', N'Chuyên môn React 19, TailwindCSS v4', 1);
    SET IDENTITY_INSERT dbo.teams OFF;
END;
GO

-- 4. Chèn Nhân viên
IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.employees ON;
    INSERT INTO dbo.employees (
        id, employee_code, full_name, email, password_hash, job_title, 
        role_id, department_id, team_id, is_active, is_deleted
    )
    VALUES 
        (1, N'EMP001', N'Nguyễn Văn Quản Trị', N'admin@tasksync.com', N'$2b$12$eXampleHashedPasswordAdminKey12345', N'System Administrator', 1, 1, 1, 1, 0),
        (2, N'EMP002', N'Trần Thị Trưởng Phòng', N'manager@tasksync.com', N'$2b$12$eXampleHashedPasswordManager12345', N'Engineering Manager', 2, 1, 1, 1, 0),
        (3, N'EMP003', N'Lê Văn Kỹ Sư', N'dev.lead@tasksync.com', N'$2b$12$eXampleHashedPasswordDevLead12345', N'Senior Backend Engineer', 3, 1, 1, 1, 0),
        (4, N'EMP004', N'Phạm Thị Thiết Kế', N'designer@tasksync.com', N'$2b$12$eXampleHashedPasswordDesigner123', N'UI/UX Designer', 3, 2, NULL, 1, 0);
    SET IDENTITY_INSERT dbo.employees OFF;

    -- Cập nhật Trưởng phòng và Trưởng nhóm
    UPDATE dbo.departments SET manager_id = 2 WHERE id = 1;
    UPDATE dbo.teams SET leader_id = 3 WHERE id = 1;
END;
GO

-- 5. Chèn Dự án
IF NOT EXISTS (SELECT 1 FROM dbo.projects WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.projects ON;
    INSERT INTO dbo.projects (
        id, project_code, name, description, status, priority, 
        department_id, team_id, created_by, is_deleted
    )
    VALUES 
        (1, N'PRJ-TASKSYNC', N'TaskSync Enterprise 2026', N'Hệ thống quản lý công việc và báo cáo dự án doanh nghiệp', N'In Progress', N'High', 1, 1, 2, 0),
        (2, N'PRJ-MOBILE', N'TaskSync Mobile App', N'Ứng dụng di động đồng bộ dữ liệu thời gian thực', N'Planning', N'Medium', 1, 2, 2, 0);
    SET IDENTITY_INSERT dbo.projects OFF;
END;
GO

-- 6. Chèn Thành viên dự án
IF NOT EXISTS (SELECT 1 FROM dbo.project_members WHERE project_id = 1 AND employee_id = 3)
BEGIN
    INSERT INTO dbo.project_members (project_id, employee_id, role_in_project)
    VALUES 
        (1, 2, N'Project Manager'),
        (1, 3, N'Technical Lead'),
        (1, 4, N'Designer'),
        (2, 2, N'Project Manager'),
        (2, 3, N'Developer');
END;
GO

-- 7. Chèn Sprint
IF NOT EXISTS (SELECT 1 FROM dbo.sprints WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.sprints ON;
    INSERT INTO dbo.sprints (
        id, project_id, name, goal, start_date, end_date, status, capacity, is_deleted
    )
    VALUES 
        (1, 1, N'Sprint 01 — Database Optimization', N'Hoàn thiện DDL, Triggers, Indexes và Stored Procedures', DATEADD(day, -7, SYSUTCDATETIME()), DATEADD(day, 7, SYSUTCDATETIME()), N'Active', 40, 0),
        (2, 1, N'Sprint 02 — API Integration & Caching', N'Kết nối ORM và kiểm thử tầng đệm Redis', DATEADD(day, 8, SYSUTCDATETIME()), DATEADD(day, 22, SYSUTCDATETIME()), N'Planned', 35, 0);
    SET IDENTITY_INSERT dbo.sprints OFF;
END;
GO

-- 8. Chèn Công việc (Tasks)
IF NOT EXISTS (SELECT 1 FROM dbo.tasks WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.tasks ON;
    INSERT INTO dbo.tasks (
        id, project_id, sprint_id, title, description, priority, status, 
        story_points, progress_percent, deadline, created_by, is_deleted
    )
    VALUES 
        (1, 1, 1, N'Thiết kế sơ đồ ERD và chuẩn hóa DDL', N'Tạo các bảng, khóa chính, khóa ngoại và ràng buộc CHECK', N'High', N'Done', 5, 100.00, DATEADD(day, -2, SYSUTCDATETIME()), 2, 0),
        (2, 1, 1, N'Cài đặt Trigger Audit Log và Soft-Delete', N'Viết T-SQL Trigger tự động ghi vết và chặn lệnh xóa cứng', N'Urgent', N'In Progress', 8, 75.00, DATEADD(day, 2, SYSUTCDATETIME()), 2, 0),
        (3, 1, 1, N'Đánh chỉ mục B-Tree và Filtered Index', N'Tối ưu hóa thời gian thực thi câu truy vấn tìm kiếm task', N'High', N'To Do', 5, 20.00, DATEADD(day, 4, SYSUTCDATETIME()), 2, 0),
        (4, 1, 1, N'Viết Stored Procedure báo cáo tổng hợp', N'Thủ tục sp_GetProjectOverviewStats và sp_CloseSprintAndRollover', N'Medium', N'Review', 5, 90.00, DATEADD(day, -1, SYSUTCDATETIME()), 2, 0),
        (5, 1, 2, N'Tích hợp tầng đệm Redis và đo lường', N'Áp dụng Read-through cache cho Dashboard metrics', N'Medium', N'To Do', 8, 0.00, DATEADD(day, 14, SYSUTCDATETIME()), 2, 0);
    SET IDENTITY_INSERT dbo.tasks OFF;

    -- Phân công công việc
    INSERT INTO dbo.task_assignments (task_id, employee_id)
    VALUES 
        (1, 3),
        (2, 3),
        (3, 3),
        (4, 4);
END;
GO

PRINT N'Chèn dữ liệu khởi tạo thành công!';
GO

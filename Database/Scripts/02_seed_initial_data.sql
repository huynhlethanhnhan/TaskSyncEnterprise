-- ============================================================================
-- TaskSyncEnterprise — Seed Data Mẫu Chuẩn Cho Demo & Báo Cáo
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Thiết kế: Idempotent (chạy nhiều lần không sinh lỗi, không phụ thuộc hardcoded ID)
-- ============================================================================

IF DB_NAME() = N'master'
    USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

SET NOCOUNT ON;

-- 1. Chèn Vai trò hệ thống
IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = N'Admin')
    INSERT INTO dbo.roles (role_name, description, is_system)
    VALUES (N'Admin', N'Quản trị viên toàn hệ thống, có toàn quyền', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = N'Manager')
    INSERT INTO dbo.roles (role_name, description, is_system)
    VALUES (N'Manager', N'Quản lý phòng ban và dự án', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE role_name = N'Employee')
    INSERT INTO dbo.roles (role_name, description, is_system)
    VALUES (N'Employee', N'Nhân viên thực hiện công việc', 1);
GO

-- 2. Chèn Phòng ban
IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE department_code = N'DEPT-TECH')
    INSERT INTO dbo.departments (department_code, name, description, is_active)
    VALUES (N'DEPT-TECH', N'Phòng Kỹ thuật & Công nghệ', N'Phát triển phần mềm, hạ tầng và CSDL', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.departments WHERE department_code = N'DEPT-PROD')
    INSERT INTO dbo.departments (department_code, name, description, is_active)
    VALUES (N'DEPT-PROD', N'Phòng Sản phẩm & Thiết kế', N'Quản lý sản phẩm, UI/UX và vận hành', 1);
GO

-- 3. Chèn Đội nhóm
DECLARE @DeptTechId INT = (SELECT TOP 1 id FROM dbo.departments WHERE department_code = N'DEPT-TECH');

IF @DeptTechId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.teams WHERE team_code = N'TEAM-BACKEND')
    INSERT INTO dbo.teams (department_id, team_code, name, description, is_active)
    VALUES (@DeptTechId, N'TEAM-BACKEND', N'Đội Backend & CSDL', N'Chuyên môn FastAPI, MS SQL Server, Redis', 1);

IF @DeptTechId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.teams WHERE team_code = N'TEAM-FRONTEND')
    INSERT INTO dbo.teams (department_id, team_code, name, description, is_active)
    VALUES (@DeptTechId, N'TEAM-FRONTEND', N'Đội Frontend React', N'Chuyên môn React 19, TailwindCSS v4', 1);
GO

-- 4. Chèn Nhân viên
DECLARE @DeptTechId INT = (SELECT TOP 1 id FROM dbo.departments WHERE department_code = N'DEPT-TECH');
DECLARE @DeptProdId INT = (SELECT TOP 1 id FROM dbo.departments WHERE department_code = N'DEPT-PROD');
DECLARE @TeamBackendId INT = (SELECT TOP 1 id FROM dbo.teams WHERE team_code = N'TEAM-BACKEND');
DECLARE @RoleAdminId INT = (SELECT TOP 1 id FROM dbo.roles WHERE role_name = N'Admin');
DECLARE @RoleManagerId INT = (SELECT TOP 1 id FROM dbo.roles WHERE role_name = N'Manager');
DECLARE @RoleEmployeeId INT = (SELECT TOP 1 id FROM dbo.roles WHERE role_name = N'Employee');

IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE email = N'admin.demo@tasksync.com')
    INSERT INTO dbo.employees (
        employee_code, full_name, email, password_hash, job_title, 
        role_id, department_id, team_id, is_active, is_deleted
    )
    VALUES (
        N'DEMO_ADMIN', N'Nguyễn Văn Quản Trị', N'admin.demo@tasksync.com', 
        N'$2b$12$eXampleHashedPasswordAdminKey12345', N'System Administrator', 
        @RoleAdminId, @DeptTechId, @TeamBackendId, 1, 0
    );

IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE email = N'manager.demo@tasksync.com')
    INSERT INTO dbo.employees (
        employee_code, full_name, email, password_hash, job_title, 
        role_id, department_id, team_id, is_active, is_deleted
    )
    VALUES (
        N'DEMO_MGR', N'Trần Thị Trưởng Phòng', N'manager.demo@tasksync.com', 
        N'$2b$12$eXampleHashedPasswordManager12345', N'Engineering Manager', 
        @RoleManagerId, @DeptTechId, @TeamBackendId, 1, 0
    );

IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE email = N'dev.demo@tasksync.com')
    INSERT INTO dbo.employees (
        employee_code, full_name, email, password_hash, job_title, 
        role_id, department_id, team_id, is_active, is_deleted
    )
    VALUES (
        N'DEMO_DEV', N'Lê Văn Kỹ Sư', N'dev.demo@tasksync.com', 
        N'$2b$12$eXampleHashedPasswordDevLead12345', N'Senior Backend Engineer', 
        @RoleEmployeeId, @DeptTechId, @TeamBackendId, 1, 0
    );

IF NOT EXISTS (SELECT 1 FROM dbo.employees WHERE email = N'designer.demo@tasksync.com')
    INSERT INTO dbo.employees (
        employee_code, full_name, email, password_hash, job_title, 
        role_id, department_id, team_id, is_active, is_deleted
    )
    VALUES (
        N'DEMO_DSG', N'Phạm Thị Thiết Kế', N'designer.demo@tasksync.com', 
        N'$2b$12$eXampleHashedPasswordDesigner123', N'UI/UX Designer', 
        @RoleEmployeeId, @DeptProdId, NULL, 1, 0
    );
GO

-- Cập nhật Trưởng phòng và Trưởng nhóm
DECLARE @ManagerId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @LeaderId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');

IF @ManagerId IS NOT NULL
    UPDATE dbo.departments SET manager_id = @ManagerId WHERE department_code = N'DEPT-TECH';

IF @LeaderId IS NOT NULL
    UPDATE dbo.teams SET leader_id = @LeaderId WHERE team_code = N'TEAM-BACKEND';
GO

-- 5. Chèn Dự án
DECLARE @DeptTechId INT = (SELECT TOP 1 id FROM dbo.departments WHERE department_code = N'DEPT-TECH');
DECLARE @TeamBackendId INT = (SELECT TOP 1 id FROM dbo.teams WHERE team_code = N'TEAM-BACKEND');
DECLARE @CreatorId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');

IF NOT EXISTS (SELECT 1 FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO')
    INSERT INTO dbo.projects (
        project_code, name, description, status, priority, 
        department_id, team_id, created_by, is_deleted
    )
    VALUES (
        N'PRJ-TASKSYNC-DEMO', N'TaskSync Enterprise 2026', 
        N'Hệ thống quản lý công việc và báo cáo dự án doanh nghiệp', 
        N'In Progress', N'High', @DeptTechId, @TeamBackendId, @CreatorId, 0
    );
GO

-- 6. Chèn Thành viên dự án
DECLARE @ProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @EmpMgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @EmpDsgId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'designer.demo@tasksync.com');

IF @ProjectId IS NOT NULL AND @EmpMgrId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.project_members WHERE project_id = @ProjectId AND employee_id = @EmpMgrId)
    INSERT INTO dbo.project_members (project_id, employee_id, role_in_project) VALUES (@ProjectId, @EmpMgrId, N'Project Manager');

IF @ProjectId IS NOT NULL AND @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.project_members WHERE project_id = @ProjectId AND employee_id = @EmpDevId)
    INSERT INTO dbo.project_members (project_id, employee_id, role_in_project) VALUES (@ProjectId, @EmpDevId, N'Technical Lead');

IF @ProjectId IS NOT NULL AND @EmpDsgId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.project_members WHERE project_id = @ProjectId AND employee_id = @EmpDsgId)
    INSERT INTO dbo.project_members (project_id, employee_id, role_in_project) VALUES (@ProjectId, @EmpDsgId, N'Designer');
GO

-- 7. Chèn Sprint
DECLARE @ProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');

IF @ProjectId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sprints WHERE project_id = @ProjectId AND name = N'Sprint 01 — Database Optimization')
    INSERT INTO dbo.sprints (project_id, name, goal, start_date, end_date, status, capacity, is_deleted)
    VALUES (@ProjectId, N'Sprint 01 — Database Optimization', N'Hoàn thiện DDL, Triggers, Indexes và Stored Procedures', DATEADD(day, -7, SYSUTCDATETIME()), DATEADD(day, 7, SYSUTCDATETIME()), N'Active', 40, 0);

IF @ProjectId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sprints WHERE project_id = @ProjectId AND name = N'Sprint 02 — API Integration & Caching')
    INSERT INTO dbo.sprints (project_id, name, goal, start_date, end_date, status, capacity, is_deleted)
    VALUES (@ProjectId, N'Sprint 02 — API Integration & Caching', N'Kết nối ORM và kiểm thử tầng đệm Redis', DATEADD(day, 8, SYSUTCDATETIME()), DATEADD(day, 22, SYSUTCDATETIME()), N'Planned', 35, 0);
GO

-- 8. Chèn Công việc (Tasks)
DECLARE @ProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @Sprint1Id INT = (SELECT TOP 1 id FROM dbo.sprints WHERE project_id = @ProjectId AND name = N'Sprint 01 — Database Optimization');
DECLARE @CreatorId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @DevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');

IF @ProjectId IS NOT NULL AND @Sprint1Id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.tasks WHERE project_id = @ProjectId AND title = N'Thiết kế sơ đồ ERD và chuẩn hóa DDL')
BEGIN
    INSERT INTO dbo.tasks (
        project_id, sprint_id, title, description, priority, status, 
        story_points, progress_percent, deadline, created_by, is_deleted
    )
    VALUES 
        (@ProjectId, @Sprint1Id, N'Thiết kế sơ đồ ERD và chuẩn hóa DDL', N'Tạo các bảng, khóa chính, khóa ngoại và ràng buộc CHECK', N'High', N'Done', 5, 100.00, DATEADD(day, -2, SYSUTCDATETIME()), @CreatorId, 0),
        (@ProjectId, @Sprint1Id, N'Cài đặt Trigger Audit Log và Soft-Delete', N'Viết T-SQL Trigger tự động ghi vết và chặn lệnh xóa cứng', N'Urgent', N'In Progress', 8, 75.00, DATEADD(day, 2, SYSUTCDATETIME()), @CreatorId, 0),
        (@ProjectId, @Sprint1Id, N'Đánh chỉ mục B-Tree và Filtered Index', N'Tối ưu hóa thời gian thực thi câu truy vấn tìm kiếm task', N'High', N'To Do', 5, 20.00, DATEADD(day, 4, SYSUTCDATETIME()), @CreatorId, 0),
        (@ProjectId, @Sprint1Id, N'Viết Stored Procedure báo cáo tổng hợp', N'Thủ tục sp_GetProjectOverviewStats và sp_CloseSprintAndRollover', N'Medium', N'Review', 5, 90.00, DATEADD(day, -1, SYSUTCDATETIME()), @CreatorId, 0);

    -- Phân công công việc cho Developer
    INSERT INTO dbo.task_assignments (task_id, employee_id)
    SELECT t.id, @DevId
    FROM dbo.tasks t
    WHERE t.project_id = @ProjectId 
      AND NOT EXISTS (SELECT 1 FROM dbo.task_assignments ta WHERE ta.task_id = t.id AND ta.employee_id = @DevId);
END;
GO

PRINT N'Chèn dữ liệu mẫu khởi tạo thành công!';
GO

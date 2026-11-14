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

-- ============================================================================
-- 9. BỔ SUNG DỮ LIỆU ĐA DẠNG PHỤC VỤ TRUY VẤN 3 BẢNG & MỞ RỘNG HRM
-- ============================================================================

-- 9.1. Dự án thứ 2 (để kiểm chứng điều kiện lọc trên bảng projects)
DECLARE @DeptProdId INT = (SELECT TOP 1 id FROM dbo.departments WHERE department_code = N'DEPT-PROD');
DECLARE @CreatorId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');

IF @DeptProdId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.projects WHERE project_code = N'PRJ-HRM-PHASE2')
    INSERT INTO dbo.projects (
        project_code, name, description, status, priority,
        department_id, team_id, created_by, is_deleted
    )
    VALUES (
        N'PRJ-HRM-PHASE2', N'HRM & Payroll Integration Phase 2',
        N'Phân hệ mở rộng quản lý hợp đồng, chấm công và quỹ phép năm',
        N'Planning', N'Medium', @DeptProdId, NULL, @CreatorId, 0
    );
GO

-- 9.2. Chủ đề thảo luận (Discussion Topics), Backlog Items & Sprint Snapshots
DECLARE @ProjectId INT = (SELECT TOP 1 id FROM dbo.projects WHERE project_code = N'PRJ-TASKSYNC-DEMO');
DECLARE @Sprint1Id INT = (SELECT TOP 1 id FROM dbo.sprints WHERE project_id = @ProjectId AND name = N'Sprint 01 — Database Optimization');
DECLARE @Sprint2Id INT = (SELECT TOP 1 id FROM dbo.sprints WHERE project_id = @ProjectId AND name = N'Sprint 02 — API Integration & Caching');
DECLARE @CreatorId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');

IF @ProjectId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.discussion_topics WHERE project_id = @ProjectId AND title = N'Chuẩn hóa Rule và Trigger trên SQL Server')
    INSERT INTO dbo.discussion_topics (project_id, title, content, created_by, is_deleted)
    VALUES (@ProjectId, N'Chuẩn hóa Rule và Trigger trên SQL Server', N'Thảo luận thiết kế Database-First và đồng bộ ORM', @CreatorId, 0);

IF @ProjectId IS NOT NULL AND @Sprint2Id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.backlog_items WHERE project_id = @ProjectId AND title = N'Tích hợp API đồng bộ chấm công HRM')
    INSERT INTO dbo.backlog_items (project_id, sprint_id, title, description, priority, status, story_points, is_deleted)
    VALUES (@ProjectId, @Sprint2Id, N'Tích hợp API đồng bộ chấm công HRM', N'Đồng bộ dữ liệu attendance_logs về dashboard quản lý', N'High', N'Backlog', 8, 0);

IF @Sprint1Id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.sprint_snapshots WHERE sprint_id = @Sprint1Id AND snapshot_date = CAST(DATEADD(day, -1, SYSUTCDATETIME()) AS DATE))
    INSERT INTO dbo.sprint_snapshots (sprint_id, snapshot_date, remaining_story_points, completed_story_points, remaining_tasks, completed_tasks)
    VALUES
        (@Sprint1Id, CAST(DATEADD(day, -2, SYSUTCDATETIME()) AS DATE), 23, 0, 4, 0),
        (@Sprint1Id, CAST(DATEADD(day, -1, SYSUTCDATETIME()) AS DATE), 18, 5, 3, 1);
GO

-- 9.3. Dữ liệu HRM: Quỹ phép năm (Leave Balances)
DECLARE @Year INT = YEAR(SYSUTCDATETIME());
DECLARE @EmpAdminId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'admin.demo@tasksync.com');
DECLARE @EmpMgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @EmpDsgId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'designer.demo@tasksync.com');

IF @EmpAdminId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.leave_balances WHERE employee_id = @EmpAdminId AND leave_year = @Year)
    INSERT INTO dbo.leave_balances (employee_id, leave_year, annual_entitlement, carried_over_days, used_days, pending_days)
    VALUES (@EmpAdminId, @Year, 12.00, 2.00, 0.00, 0.00);

IF @EmpMgrId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.leave_balances WHERE employee_id = @EmpMgrId AND leave_year = @Year)
    INSERT INTO dbo.leave_balances (employee_id, leave_year, annual_entitlement, carried_over_days, used_days, pending_days)
    VALUES (@EmpMgrId, @Year, 15.00, 1.00, 0.00, 0.00);

IF @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.leave_balances WHERE employee_id = @EmpDevId AND leave_year = @Year)
    INSERT INTO dbo.leave_balances (employee_id, leave_year, annual_entitlement, carried_over_days, used_days, pending_days)
    VALUES (@EmpDevId, @Year, 12.00, 0.00, 0.00, 0.00);

IF @EmpDsgId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.leave_balances WHERE employee_id = @EmpDsgId AND leave_year = @Year)
    INSERT INTO dbo.leave_balances (employee_id, leave_year, annual_entitlement, carried_over_days, used_days, pending_days)
    VALUES (@EmpDsgId, @Year, 12.00, 0.00, 0.00, 0.00);
GO

-- 9.4. Dữ liệu HRM: Hợp đồng lao động (Employment Contracts)
DECLARE @EmpMgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @EmpDsgId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'designer.demo@tasksync.com');

IF @EmpMgrId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.employment_contracts WHERE contract_code = N'HDLD-2026-001')
    INSERT INTO dbo.employment_contracts (employee_id, contract_code, contract_type, base_salary, allowance, currency, start_date, status)
    VALUES (@EmpMgrId, N'HDLD-2026-001', N'Indefinite', 35000000.00, 3000000.00, N'VND', '2024-01-01', N'Active');

IF @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.employment_contracts WHERE contract_code = N'HDLD-2026-002')
    INSERT INTO dbo.employment_contracts (employee_id, contract_code, contract_type, base_salary, allowance, currency, start_date, status)
    VALUES (@EmpDevId, N'HDLD-2026-002', N'Indefinite', 28000000.00, 2000000.00, N'VND', '2025-03-01', N'Active');

IF @EmpDsgId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.employment_contracts WHERE contract_code = N'HDLD-2026-003')
    INSERT INTO dbo.employment_contracts (employee_id, contract_code, contract_type, base_salary, allowance, currency, start_date, end_date, status)
    VALUES (@EmpDsgId, N'HDLD-2026-003', N'Fixed-Term', 20000000.00, 1500000.00, N'VND', '2026-01-01', '2026-12-31', N'Active');
GO

-- 9.5. Dữ liệu HRM: Đơn nghỉ phép (Vacations) — kích hoạt Trigger kiểm tra trùng lịch & quỹ phép
DECLARE @EmpMgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @EmpDsgId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'designer.demo@tasksync.com');

IF @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.vacations WHERE requested_by = @EmpDevId AND reason = N'Nghỉ phép năm giải quyết việc gia đình')
    INSERT INTO dbo.vacations (type, start_date, end_date, reason, status, requested_by)
    VALUES (N'Annual Leave', DATEADD(day, 10, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(day, 11, CAST(SYSUTCDATETIME() AS DATE)), N'Nghỉ phép năm giải quyết việc gia đình', N'Pending', @EmpDevId);

IF @EmpDevId IS NOT NULL AND @EmpMgrId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.vacations WHERE requested_by = @EmpDevId AND reason = N'Khám sức khỏe định kỳ')
    INSERT INTO dbo.vacations (type, start_date, end_date, reason, status, requested_by, approved_by, approved_at)
    VALUES (N'Annual Leave', DATEADD(day, -15, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(day, -15, CAST(SYSUTCDATETIME() AS DATE)), N'Khám sức khỏe định kỳ', N'HR Approved', @EmpDevId, @EmpMgrId, SYSUTCDATETIME());

IF @EmpDsgId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.vacations WHERE requested_by = @EmpDsgId AND reason = N'Nghỉ phép cá nhân')
    INSERT INTO dbo.vacations (type, start_date, end_date, reason, status, requested_by)
    VALUES (N'Annual Leave', DATEADD(day, 5, CAST(SYSUTCDATETIME() AS DATE)), DATEADD(day, 6, CAST(SYSUTCDATETIME() AS DATE)), N'Nghỉ phép cá nhân', N'Manager Approved', @EmpDsgId);
GO

-- 9.6. Dữ liệu HRM: Chấm công (Attendance Logs)
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);

IF @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.attendance_logs WHERE employee_id = @EmpDevId AND work_date = @Today)
    INSERT INTO dbo.attendance_logs (employee_id, work_date, check_in, check_out, work_hours, overtime_hours, status, note)
    VALUES (@EmpDevId, @Today, '08:30:00', '17:45:00', 8.00, 0.25, N'Present', N'Làm việc đúng giờ tại văn phòng');
GO

-- 9.7. Dữ liệu Thông báo mẫu (Notifications)
DECLARE @EmpDevId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'dev.demo@tasksync.com');
DECLARE @EmpMgrId INT = (SELECT TOP 1 id FROM dbo.employees WHERE email = N'manager.demo@tasksync.com');

IF @EmpDevId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.notifications WHERE event_id = N'SEED_TASK_ASSIGNED_01')
    INSERT INTO dbo.notifications (employee_id, event_id, type, title, message, priority, status, channel)
    VALUES (@EmpDevId, N'SEED_TASK_ASSIGNED_01', N'TASK_ASSIGNED', N'Bạn được giao công việc mới', N'Vui lòng kiểm tra Sprint 01 — Database Optimization.', N'NORMAL', N'PENDING', N'IN_APP');

IF @EmpMgrId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.notifications WHERE event_id = N'SEED_LEAVE_PENDING_01')
    INSERT INTO dbo.notifications (employee_id, event_id, type, title, message, priority, status, channel)
    VALUES (@EmpMgrId, N'SEED_LEAVE_PENDING_01', N'LEAVE_REQUEST', N'Có đơn xin nghỉ phép chờ duyệt', N'Nhân viên Lê Văn Kỹ Sư đã gửi đơn xin nghỉ phép năm.', N'HIGH', N'PENDING', N'IN_APP');
GO

PRINT N'Chèn dữ liệu mẫu khởi tạo (Work Management + HRM) thành công!';
GO

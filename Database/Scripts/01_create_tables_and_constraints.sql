-- ============================================================================
-- TaskSyncEnterprise — Database-First Master DDL Schema
-- Hệ quản trị CSDL: Microsoft SQL Server 2019 / 2022
-- Chuẩn quy ước: Unicode (NVARCHAR), UTC Datetime SYSUTCDATETIME()
-- ============================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'TaskSyncEnterprise')
BEGIN
    CREATE DATABASE TaskSyncEnterprise
    COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END;
GO

USE TaskSyncEnterprise;
GO

-- Đảm bảo schema dbo tồn tại
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo')
    EXEC('CREATE SCHEMA dbo');
GO

-- ============================================================================
-- PHẦN 1: QUẢN TRỊ TỔ CHỨC & TÀI KHOẢN (ADMINISTRATION CONTEXT)
-- ============================================================================

-- 1. Bảng Vai trò hệ thống (Roles)
IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
        id INT IDENTITY(1,1) NOT NULL,
        role_name NVARCHAR(50) NOT NULL,
        description NVARCHAR(255) NULL,
        is_system BIT NOT NULL CONSTRAINT DF_roles_is_system DEFAULT (0),
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_roles_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_roles PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_roles_role_name UNIQUE (role_name)
    );
END;
GO

-- 2. Bảng Phòng ban (Departments)
IF OBJECT_ID(N'dbo.departments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.departments (
        id INT IDENTITY(1,1) NOT NULL,
        department_code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX) NULL,
        manager_id INT NULL,
        is_active BIT NOT NULL CONSTRAINT DF_departments_is_active DEFAULT (1),
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_departments_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        CONSTRAINT PK_departments PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_departments_department_code UNIQUE (department_code),
        CONSTRAINT UQ_departments_name UNIQUE (name)
    );
END;
GO

-- 3. Bảng Đội nhóm (Teams)
IF OBJECT_ID(N'dbo.teams', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.teams (
        id INT IDENTITY(1,1) NOT NULL,
        department_id INT NOT NULL,
        team_code NVARCHAR(30) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(MAX) NULL,
        leader_id INT NULL,
        is_active BIT NOT NULL CONSTRAINT DF_teams_is_active DEFAULT (1),
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_teams_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        CONSTRAINT PK_teams PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_teams_team_code UNIQUE (team_code),
        CONSTRAINT FK_teams_department FOREIGN KEY (department_id) 
            REFERENCES dbo.departments(id) ON DELETE NO ACTION
    );
END;
GO

-- 4. Bảng Nhân viên (Employees)
IF OBJECT_ID(N'dbo.employees', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.employees (
        id INT IDENTITY(1,1) NOT NULL,
        employee_code NVARCHAR(30) NOT NULL,
        full_name NVARCHAR(150) NOT NULL,
        email NVARCHAR(255) NOT NULL,
        phone NVARCHAR(50) NULL,
        gender NVARCHAR(20) NULL,
        address NVARCHAR(255) NULL,
        date_of_birth DATE NULL,
        start_date DATE NULL,
        password_hash NVARCHAR(255) NOT NULL,
        avatar_url NVARCHAR(500) NULL,
        job_title NVARCHAR(100) NULL,
        employment_status NVARCHAR(50) NOT NULL CONSTRAINT DF_employees_status DEFAULT (N'Full-time'),
        is_first_login BIT NOT NULL CONSTRAINT DF_employees_is_first_login DEFAULT (1),
        login_count INT NOT NULL CONSTRAINT DF_employees_login_count DEFAULT (0),
        last_login DATETIME2(7) NULL,
        last_logout DATETIME2(7) NULL,
        department_id INT NULL,
        team_id INT NULL,
        role_id INT NOT NULL,
        manager_id INT NULL,
        is_active BIT NOT NULL CONSTRAINT DF_employees_is_active DEFAULT (1),
        is_deleted BIT NOT NULL CONSTRAINT DF_employees_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_employees_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_employees PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_employees_code UNIQUE (employee_code),
        CONSTRAINT UQ_employees_email UNIQUE (email),
        CONSTRAINT FK_employees_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id),
        CONSTRAINT FK_employees_department FOREIGN KEY (department_id) REFERENCES dbo.departments(id),
        CONSTRAINT FK_employees_team FOREIGN KEY (team_id) REFERENCES dbo.teams(id),
        CONSTRAINT FK_employees_manager FOREIGN KEY (manager_id) REFERENCES dbo.employees(id)
    );
END;
GO

-- Bổ sung FK manager_id cho departments và leader_id cho teams (tránh phụ thuộc vòng khi tạo bảng)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_departments_manager')
    ALTER TABLE dbo.departments ADD CONSTRAINT FK_departments_manager 
    FOREIGN KEY (manager_id) REFERENCES dbo.employees(id);
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_teams_leader')
    ALTER TABLE dbo.teams ADD CONSTRAINT FK_teams_leader 
    FOREIGN KEY (leader_id) REFERENCES dbo.employees(id);
GO

-- 5. Bảng Nhật ký kiểm toán (Audit Logs)
IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.audit_logs (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NULL,
        employee_email NVARCHAR(255) NULL,
        action NVARCHAR(255) NOT NULL,
        entity_type NVARCHAR(100) NULL,
        entity_id INT NULL,
        old_values NVARCHAR(MAX) NULL,
        new_values NVARCHAR(MAX) NULL,
        ip_address NVARCHAR(50) NULL,
        timestamp DATETIME2(7) NOT NULL CONSTRAINT DF_audit_logs_timestamp DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_audit_logs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_audit_logs_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id) ON DELETE SET NULL
    );
END;
GO

-- ============================================================================
-- PHẦN 2: QUẢN LÝ DỰ ÁN & CÔNG VIỆC AGILE (WORK MANAGEMENT CONTEXT)
-- ============================================================================

-- 6. Bảng Dự án (Projects)
IF OBJECT_ID(N'dbo.projects', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.projects (
        id INT IDENTITY(1,1) NOT NULL,
        project_code NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        status NVARCHAR(50) NOT NULL CONSTRAINT DF_projects_status DEFAULT (N'Planning'),
        priority NVARCHAR(20) NOT NULL CONSTRAINT DF_projects_priority DEFAULT (N'Medium'),
        start_date DATETIME2(7) NULL,
        end_date DATETIME2(7) NULL,
        department_id INT NULL,
        team_id INT NULL,
        created_by INT NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_projects_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_projects_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_projects PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_projects_code UNIQUE (project_code),
        CONSTRAINT FK_projects_department FOREIGN KEY (department_id) REFERENCES dbo.departments(id),
        CONSTRAINT FK_projects_team FOREIGN KEY (team_id) REFERENCES dbo.teams(id),
        CONSTRAINT FK_projects_creator FOREIGN KEY (created_by) REFERENCES dbo.employees(id),
        CONSTRAINT CK_projects_priority CHECK (priority IN (N'Low', N'Medium', N'High', N'Urgent'))
    );
END;
GO

-- 7. Bảng Thành viên Dự án (Project Members - Quan hệ N-N)
IF OBJECT_ID(N'dbo.project_members', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_members (
        id INT IDENTITY(1,1) NOT NULL,
        project_id INT NOT NULL,
        employee_id INT NOT NULL,
        role_in_project NVARCHAR(50) NOT NULL CONSTRAINT DF_project_members_role DEFAULT (N'Member'),
        joined_at DATETIME2(7) NOT NULL CONSTRAINT DF_project_members_joined_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_project_members PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_project_members_project_employee UNIQUE (project_id, employee_id),
        CONSTRAINT FK_project_members_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id) ON DELETE CASCADE,
        CONSTRAINT FK_project_members_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id) ON DELETE CASCADE
    );
END;
GO

-- 8. Bảng Sprint (Sprints)
IF OBJECT_ID(N'dbo.sprints', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sprints (
        id INT IDENTITY(1,1) NOT NULL,
        project_id INT NOT NULL,
        name NVARCHAR(150) NOT NULL,
        goal NVARCHAR(MAX) NULL,
        start_date DATETIME2(7) NULL,
        end_date DATETIME2(7) NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_sprints_status DEFAULT (N'Planned'),
        capacity INT NOT NULL CONSTRAINT DF_sprints_capacity DEFAULT (0),
        is_deleted BIT NOT NULL CONSTRAINT DF_sprints_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_sprints_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_sprints PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_sprints_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id),
        CONSTRAINT CK_sprints_status CHECK (status IN (N'Planned', N'Active', N'Completed', N'Cancelled'))
    );
END;
GO

-- 9. Bảng Ảnh chụp tiến độ Sprint hàng ngày (Sprint Snapshots - Phục vụ Burndown Chart)
IF OBJECT_ID(N'dbo.sprint_snapshots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.sprint_snapshots (
        id INT IDENTITY(1,1) NOT NULL,
        sprint_id INT NOT NULL,
        snapshot_date DATE NOT NULL,
        remaining_story_points INT NOT NULL CONSTRAINT DF_snapshots_rem_sp DEFAULT (0),
        completed_story_points INT NOT NULL CONSTRAINT DF_snapshots_comp_sp DEFAULT (0),
        remaining_tasks INT NOT NULL CONSTRAINT DF_snapshots_rem_tasks DEFAULT (0),
        completed_tasks INT NOT NULL CONSTRAINT DF_snapshots_comp_tasks DEFAULT (0),
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_snapshots_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_sprint_snapshots PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_sprint_snapshots_date UNIQUE (sprint_id, snapshot_date),
        CONSTRAINT FK_sprint_snapshots_sprint FOREIGN KEY (sprint_id) REFERENCES dbo.sprints(id) ON DELETE CASCADE
    );
END;
GO

-- 10. Bảng Chủ đề thảo luận / Epic (Discussion Topics)
IF OBJECT_ID(N'dbo.discussion_topics', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.discussion_topics (
        id INT IDENTITY(1,1) NOT NULL,
        project_id INT NOT NULL,
        title NVARCHAR(255) NOT NULL,
        content NVARCHAR(MAX) NULL,
        created_by INT NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_discussion_topics_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_discussion_topics_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_discussion_topics PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_discussion_topics_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id),
        CONSTRAINT FK_discussion_topics_creator FOREIGN KEY (created_by) REFERENCES dbo.employees(id)
    );
END;
GO

-- 11. Bảng Công việc (Tasks)
IF OBJECT_ID(N'dbo.tasks', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tasks (
        id INT IDENTITY(1,1) NOT NULL,
        project_id INT NOT NULL,
        sprint_id INT NULL,
        topic_id INT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        priority NVARCHAR(20) NOT NULL CONSTRAINT DF_tasks_priority DEFAULT (N'Medium'),
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_tasks_status DEFAULT (N'To Do'),
        story_points INT NULL,
        progress_percent NUMERIC(5,2) NOT NULL CONSTRAINT DF_tasks_progress DEFAULT (0.00),
        deadline DATETIME2(7) NULL,
        created_by INT NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_tasks_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_tasks_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_tasks PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_tasks_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id),
        CONSTRAINT FK_tasks_sprint FOREIGN KEY (sprint_id) REFERENCES dbo.sprints(id),
        CONSTRAINT FK_tasks_topic FOREIGN KEY (topic_id) REFERENCES dbo.discussion_topics(id),
        CONSTRAINT FK_tasks_creator FOREIGN KEY (created_by) REFERENCES dbo.employees(id),
        CONSTRAINT CK_tasks_status CHECK (status IN (N'To Do', N'In Progress', N'Review', N'Done')),
        CONSTRAINT CK_tasks_priority CHECK (priority IN (N'Low', N'Medium', N'High', N'Urgent')),
        CONSTRAINT CK_tasks_progress CHECK (progress_percent BETWEEN 0.00 AND 100.00)
    );
END;
GO

-- 12. Bảng Phân công Task (Task Assignments - Quan hệ N-N)
IF OBJECT_ID(N'dbo.task_assignments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.task_assignments (
        id INT IDENTITY(1,1) NOT NULL,
        task_id INT NOT NULL,
        employee_id INT NOT NULL,
        assigned_at DATETIME2(7) NOT NULL CONSTRAINT DF_task_assignments_assigned_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_task_assignments PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_task_assignments_task_emp UNIQUE (task_id, employee_id),
        CONSTRAINT FK_task_assignments_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id) ON DELETE CASCADE,
        CONSTRAINT FK_task_assignments_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id) ON DELETE CASCADE
    );
END;
GO

-- 13. Bảng Backlog Items
IF OBJECT_ID(N'dbo.backlog_items', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.backlog_items (
        id INT IDENTITY(1,1) NOT NULL,
        project_id INT NOT NULL,
        sprint_id INT NULL,
        task_id INT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        priority NVARCHAR(20) NOT NULL CONSTRAINT DF_backlog_items_priority DEFAULT (N'Medium'),
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_backlog_items_status DEFAULT (N'Backlog'),
        story_points INT NOT NULL CONSTRAINT DF_backlog_items_sp DEFAULT (0),
        is_deleted BIT NOT NULL CONSTRAINT DF_backlog_items_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_backlog_items_created_at DEFAULT (SYSUTCDATETIME()),
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_backlog_items PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_backlog_items_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id),
        CONSTRAINT FK_backlog_items_sprint FOREIGN KEY (sprint_id) REFERENCES dbo.sprints(id),
        CONSTRAINT FK_backlog_items_task FOREIGN KEY (task_id) REFERENCES dbo.tasks(id)
    );
END;
GO

-- 14. Bảng Thông báo (Notifications)
IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.notifications (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NOT NULL,
        event_id NVARCHAR(100) NULL,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(255) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        priority NVARCHAR(20) NOT NULL CONSTRAINT DF_notifications_priority DEFAULT (N'NORMAL'),
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_notifications_status DEFAULT (N'PENDING'),
        channel NVARCHAR(30) NOT NULL CONSTRAINT DF_notifications_channel DEFAULT (N'IN_APP'),
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_notifications_created_at DEFAULT (SYSUTCDATETIME()),
        read_at DATETIME2(7) NULL,
        CONSTRAINT PK_notifications PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_notifications_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id) ON DELETE CASCADE,
        CONSTRAINT CK_notifications_priority CHECK (priority IN (N'LOW', N'NORMAL', N'HIGH', N'CRITICAL')),
        CONSTRAINT CK_notifications_status CHECK (status IN (N'PENDING', N'PROCESSING', N'SENT', N'FAILED', N'READ', N'ARCHIVED')),
        CONSTRAINT CK_notifications_channel CHECK (channel IN (N'IN_APP', N'EMAIL', N'WEBSOCKET', N'PUSH', N'SMS', N'SLACK', N'TEAMS'))
    );
END;
GO

-- ============================================================================
-- PHẦN 3: MỞ RỘNG QUẢN TRỊ NHÂN SỰ (HRM EXTENSIBILITY & GOVERNANCE CONTEXT)
-- Thiết kế sẵn sàng tích hợp phân hệ HRM: Nghỉ phép, Quỹ phép năm, Hợp đồng,
-- Chấm công và Nhật ký Backup/Phục hồi dữ liệu.
-- ============================================================================

-- 15. Bảng Đơn xin nghỉ phép (Vacations / Leave Requests)
IF OBJECT_ID(N'dbo.vacations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.vacations (
        id INT IDENTITY(1,1) NOT NULL,
        type NVARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason NVARCHAR(500) NULL,
        status NVARCHAR(50) NOT NULL CONSTRAINT DF_vacations_status DEFAULT (N'Pending'),
        requested_by INT NOT NULL,
        approved_by INT NULL,
        approved_at DATETIME2(7) NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_vacations_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_vacations_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_vacations PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_vacations_requester FOREIGN KEY (requested_by) REFERENCES dbo.employees(id),
        CONSTRAINT FK_vacations_approver FOREIGN KEY (approved_by) REFERENCES dbo.employees(id),
        CONSTRAINT CK_vacations_dates CHECK (end_date >= start_date),
        CONSTRAINT CK_vacations_type CHECK (type IN (
            N'Annual Leave', N'Sick Leave', N'Unpaid Leave',
            N'Maternity Leave', N'Remote Work', N'Emergency Leave', N'Other'
        )),
        CONSTRAINT CK_vacations_status CHECK (status IN (
            N'Pending', N'Manager Approved', N'HR Approved', N'Approved',
            N'Info Requested', N'Rejected', N'Withdrawn', N'Cancelled'
        ))
    );
END;
GO

-- 16. Bảng Quỹ phép năm theo nhân viên (Leave Balances - HRM)
IF OBJECT_ID(N'dbo.leave_balances', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.leave_balances (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NOT NULL,
        leave_year INT NOT NULL,
        annual_entitlement DECIMAL(5,2) NOT NULL CONSTRAINT DF_leave_balances_entitlement DEFAULT (12.00),
        carried_over_days DECIMAL(5,2) NOT NULL CONSTRAINT DF_leave_balances_carried DEFAULT (0.00),
        used_days DECIMAL(5,2) NOT NULL CONSTRAINT DF_leave_balances_used DEFAULT (0.00),
        pending_days DECIMAL(5,2) NOT NULL CONSTRAINT DF_leave_balances_pending DEFAULT (0.00),
        remaining_days AS (annual_entitlement + carried_over_days - used_days - pending_days),
        updated_at DATETIME2(7) NULL,
        CONSTRAINT PK_leave_balances PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_leave_balances_emp_year UNIQUE (employee_id, leave_year),
        CONSTRAINT FK_leave_balances_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
        CONSTRAINT CK_leave_balances_year CHECK (leave_year BETWEEN 2020 AND 2100),
        CONSTRAINT CK_leave_balances_non_negative CHECK (
            annual_entitlement >= 0.00 AND carried_over_days >= 0.00
            AND used_days >= 0.00 AND pending_days >= 0.00
        )
    );
END;
GO

-- 17. Bảng Hợp đồng lao động (Employment Contracts - HRM)
IF OBJECT_ID(N'dbo.employment_contracts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.employment_contracts (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NOT NULL,
        contract_code NVARCHAR(50) NOT NULL,
        contract_type NVARCHAR(50) NOT NULL CONSTRAINT DF_contracts_type DEFAULT (N'Indefinite'),
        base_salary DECIMAL(18,2) NOT NULL,
        allowance DECIMAL(18,2) NOT NULL CONSTRAINT DF_contracts_allowance DEFAULT (0.00),
        currency NVARCHAR(10) NOT NULL CONSTRAINT DF_contracts_currency DEFAULT (N'VND'),
        start_date DATE NOT NULL,
        end_date DATE NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_contracts_status DEFAULT (N'Active'),
        is_deleted BIT NOT NULL CONSTRAINT DF_contracts_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_contracts_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_employment_contracts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_employment_contracts_code UNIQUE (contract_code),
        CONSTRAINT FK_employment_contracts_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
        CONSTRAINT CK_employment_contracts_type CHECK (contract_type IN (
            N'Probation', N'Fixed-Term', N'Indefinite', N'Part-Time', N'Contractor'
        )),
        CONSTRAINT CK_employment_contracts_status CHECK (status IN (
            N'Draft', N'Active', N'Expired', N'Terminated'
        )),
        CONSTRAINT CK_employment_contracts_salary CHECK (base_salary >= 0.00 AND allowance >= 0.00),
        CONSTRAINT CK_employment_contracts_dates CHECK (end_date IS NULL OR end_date >= start_date)
    );
END;
GO

-- 18. Bảng Chấm công hàng ngày (Attendance Logs - HRM)
IF OBJECT_ID(N'dbo.attendance_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.attendance_logs (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NOT NULL,
        work_date DATE NOT NULL,
        check_in TIME(0) NULL,
        check_out TIME(0) NULL,
        work_hours DECIMAL(5,2) NOT NULL CONSTRAINT DF_attendance_work_hours DEFAULT (0.00),
        overtime_hours DECIMAL(5,2) NOT NULL CONSTRAINT DF_attendance_ot_hours DEFAULT (0.00),
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_attendance_status DEFAULT (N'Present'),
        note NVARCHAR(255) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_attendance_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_attendance_logs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_attendance_logs_emp_date UNIQUE (employee_id, work_date),
        CONSTRAINT FK_attendance_logs_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
        CONSTRAINT CK_attendance_logs_status CHECK (status IN (
            N'Present', N'Remote', N'Leave', N'Absent', N'Holiday'
        )),
        CONSTRAINT CK_attendance_logs_hours CHECK (
            work_hours BETWEEN 0.00 AND 24.00
            AND overtime_hours BETWEEN 0.00 AND 24.00
        )
    );
END;
GO

-- 19. Bảng Nhật ký Sao lưu & Phục hồi Dữ liệu (Backup History Logs)
IF OBJECT_ID(N'dbo.backup_history_logs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.backup_history_logs (
        id INT IDENTITY(1,1) NOT NULL,
        backup_type NVARCHAR(30) NOT NULL,
        database_name NVARCHAR(128) NOT NULL,
        backup_path NVARCHAR(500) NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_backup_logs_status DEFAULT (N'SUCCESS'),
        performed_by INT NULL,
        notes NVARCHAR(500) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_backup_logs_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_backup_history_logs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_backup_history_employee FOREIGN KEY (performed_by) REFERENCES dbo.employees(id),
        CONSTRAINT CK_backup_history_type CHECK (backup_type IN (
            N'FULL', N'DIFFERENTIAL', N'LOG', N'SNAPSHOT', N'LOGICAL_ROLLBACK'
        )),
        CONSTRAINT CK_backup_history_status CHECK (status IN (
            N'SUCCESS', N'VERIFIED', N'FAILED', N'RESTORED'
        ))
    );
END;
GO

-- 20. Bảng Yêu cầu Làm thêm giờ (Overtime Requests - HRM & Work Integration)
IF OBJECT_ID(N'dbo.overtime_requests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.overtime_requests (
        id INT IDENTITY(1,1) NOT NULL,
        employee_id INT NOT NULL,
        project_id INT NULL,
        work_date DATE NOT NULL,
        hours DECIMAL(4,2) NOT NULL,
        reason NVARCHAR(500) NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_overtime_requests_status DEFAULT (N'Pending'),
        team_leader_note NVARCHAR(300) NULL,
        approved_by INT NULL,
        approved_at DATETIME2(7) NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_overtime_requests_is_deleted DEFAULT (0),
        deleted_at DATETIME2(7) NULL,
        created_at DATETIME2(7) NOT NULL CONSTRAINT DF_overtime_requests_created_at DEFAULT (SYSUTCDATETIME()),
        updated_at DATETIME2(7) NULL,
        created_by_id INT NULL,
        updated_by_id INT NULL,
        deleted_by_id INT NULL,
        CONSTRAINT PK_overtime_requests PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_overtime_requests_employee FOREIGN KEY (employee_id) REFERENCES dbo.employees(id),
        CONSTRAINT FK_overtime_requests_project FOREIGN KEY (project_id) REFERENCES dbo.projects(id),
        CONSTRAINT FK_overtime_requests_approver FOREIGN KEY (approved_by) REFERENCES dbo.employees(id),
        CONSTRAINT CK_overtime_requests_hours CHECK (hours > 0.00 AND hours <= 16.00),
        CONSTRAINT CK_overtime_requests_status CHECK (status IN (
            N'Pending', N'Manager Approved', N'HR Approved', N'Rejected', N'Withdrawn'
        ))
    );
END;
GO

-- ============================================================================
-- PHẦN 4: BẢO ĐẢM TÍNH TƯƠNG THÍCH TRÊN CSDL ĐÃ TỒN TẠI TỪ TRƯỚC (IDEMPOTENT MIGRATION)
-- Nếu các bảng đã tồn tại từ các phiên bản migration cũ, tự động bổ sung các cột còn thiếu.
-- ============================================================================

-- Bổ sung cho dbo.tasks
IF COL_LENGTH('dbo.tasks', 'deleted_at') IS NULL
    ALTER TABLE dbo.tasks ADD deleted_at DATETIME2(7) NULL;
GO
IF COL_LENGTH('dbo.tasks', 'updated_at') IS NULL
    ALTER TABLE dbo.tasks ADD updated_at DATETIME2(7) NULL;
GO
IF COL_LENGTH('dbo.tasks', 'created_by_id') IS NULL
    ALTER TABLE dbo.tasks ADD created_by_id INT NULL;
GO
IF COL_LENGTH('dbo.tasks', 'updated_by_id') IS NULL
    ALTER TABLE dbo.tasks ADD updated_by_id INT NULL;
GO
IF COL_LENGTH('dbo.tasks', 'deleted_by_id') IS NULL
    ALTER TABLE dbo.tasks ADD deleted_by_id INT NULL;
GO

-- Bổ sung cho dbo.sprints
IF COL_LENGTH('dbo.sprints', 'updated_at') IS NULL
    ALTER TABLE dbo.sprints ADD updated_at DATETIME2(7) NULL;
GO

-- Bổ sung cho dbo.project_members
IF COL_LENGTH('dbo.project_members', 'role_in_project') IS NULL
    ALTER TABLE dbo.project_members ADD role_in_project NVARCHAR(50) NOT NULL CONSTRAINT DF_project_members_role DEFAULT (N'Member');
GO

-- Bổ sung cho dbo.audit_logs
IF COL_LENGTH('dbo.audit_logs', 'entity_type') IS NULL
    ALTER TABLE dbo.audit_logs ADD entity_type NVARCHAR(100) NULL;
GO
IF COL_LENGTH('dbo.audit_logs', 'entity_id') IS NULL
    ALTER TABLE dbo.audit_logs ADD entity_id INT NULL;
GO
IF COL_LENGTH('dbo.audit_logs', 'old_values') IS NULL
    ALTER TABLE dbo.audit_logs ADD old_values NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.audit_logs', 'new_values') IS NULL
    ALTER TABLE dbo.audit_logs ADD new_values NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('dbo.audit_logs', 'ip_address') IS NULL
    ALTER TABLE dbo.audit_logs ADD ip_address NVARCHAR(50) NULL;
GO

-- Bổ sung cho dbo.vacations (nếu bảng cũ được tạo bởi Alembic chưa có cột soft-delete)
IF COL_LENGTH('dbo.vacations', 'is_deleted') IS NULL
    ALTER TABLE dbo.vacations ADD is_deleted BIT NOT NULL CONSTRAINT DF_vacations_is_deleted DEFAULT (0);
GO
IF COL_LENGTH('dbo.vacations', 'deleted_at') IS NULL
    ALTER TABLE dbo.vacations ADD deleted_at DATETIME2(7) NULL;
GO
IF COL_LENGTH('dbo.vacations', 'deleted_by_id') IS NULL
    ALTER TABLE dbo.vacations ADD deleted_by_id INT NULL;
GO

-- ============================================================================
-- PHẦN 5: ÁP DỤNG SQL SERVER RULE (CREATE RULE & sp_bindrule) CHO NGHIỆP VỤ
-- Đáp ứng chuẩn đối tượng RULE bản địa trong Microsoft SQL Server.
-- ============================================================================

-- RULE 1: rul_TaskStoryPoints_NonNegative
-- Nghiệp vụ Agile: Story Points ước lượng công việc phải nằm trong khoảng [0, 100].
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.tasks') AND name = N'story_points' AND rule_object_id <> 0)
    EXEC sys.sp_unbindrule @objname = N'dbo.tasks.story_points';
GO
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.backlog_items') AND name = N'story_points' AND rule_object_id <> 0)
    EXEC sys.sp_unbindrule @objname = N'dbo.backlog_items.story_points';
GO
IF OBJECT_ID(N'dbo.rul_TaskStoryPoints_NonNegative', N'R') IS NOT NULL
    DROP RULE dbo.rul_TaskStoryPoints_NonNegative;
GO

CREATE RULE dbo.rul_TaskStoryPoints_NonNegative
AS @sp >= 0 AND @sp <= 100;
GO

EXEC sys.sp_bindrule N'dbo.rul_TaskStoryPoints_NonNegative', N'dbo.tasks.story_points';
EXEC sys.sp_bindrule N'dbo.rul_TaskStoryPoints_NonNegative', N'dbo.backlog_items.story_points';
GO

-- RULE 2: rul_EmployeeEmailFormat
-- Nghiệp vụ Nhân sự (HRM): Email nhân viên phải có dạng hợp lệ (chứa '@', có tên miền '.', không chứa khoảng trắng).
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employees') AND name = N'email' AND rule_object_id <> 0)
    EXEC sys.sp_unbindrule @objname = N'dbo.employees.email';
GO
IF OBJECT_ID(N'dbo.rul_EmployeeEmailFormat', N'R') IS NOT NULL
    DROP RULE dbo.rul_EmployeeEmailFormat;
GO

CREATE RULE dbo.rul_EmployeeEmailFormat
AS @email LIKE N'%_@__%.__%' AND @email NOT LIKE N'% %';
GO

EXEC sys.sp_bindrule N'dbo.rul_EmployeeEmailFormat', N'dbo.employees.email';
GO

-- RULE 3: rul_EmployeeEmploymentStatus_HRM
-- Nghiệp vụ Nhân sự (HRM): Trạng thái làm việc của nhân viên phải thuộc tập giá trị chuẩn HRM.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.employees') AND name = N'employment_status' AND rule_object_id <> 0)
    EXEC sys.sp_unbindrule @objname = N'dbo.employees.employment_status';
GO
IF OBJECT_ID(N'dbo.rul_EmployeeEmploymentStatus_HRM', N'R') IS NOT NULL
    DROP RULE dbo.rul_EmployeeEmploymentStatus_HRM;
GO

CREATE RULE dbo.rul_EmployeeEmploymentStatus_HRM
AS @status IN (N'Full-time', N'Part-time', N'Intern', N'Probation', N'Contract', N'Active', N'On Leave', N'Resigned', N'Terminated');
GO

EXEC sys.sp_bindrule N'dbo.rul_EmployeeEmploymentStatus_HRM', N'dbo.employees.employment_status';
GO


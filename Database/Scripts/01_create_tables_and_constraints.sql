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
-- PHẦN 3: BẢO ĐẢM TÍNH TƯƠNG THÍCH TRÊN CSDL ĐÃ TỒN TẠI TỪ TRƯỚC (IDEMPOTENT MIGRATION)
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


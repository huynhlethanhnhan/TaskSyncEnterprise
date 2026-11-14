-- ============================================================================
-- TaskSyncEnterprise — Master Views (Quy tắc truy vấn toàn cục & Báo cáo)
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Mục đích: Đóng gói quy tắc lọc xóa mềm toàn cục (Global Soft Delete Filter),
--           chuẩn hóa Row-Level Data Access và đơn giản hóa truy vấn báo cáo
-- ============================================================================

USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- VIEW 1: vw_ActiveTasksOverview
-- Quy tắc toàn cục:
--   1. Tự động loại bỏ toàn bộ bản ghi đã bị xóa mềm (t.is_deleted = 0, p.is_deleted = 0).
--   2. Join sẵn tên Dự án, tên Sprint, tên Người tạo để tầng Ứng dụng / Báo cáo
--      không cần viết lại các câu JOIN lặp đi lặp lại.
-- ============================================================================
IF OBJECT_ID(N'dbo.vw_ActiveTasksOverview', N'V') IS NOT NULL
    DROP VIEW dbo.vw_ActiveTasksOverview;
GO

CREATE VIEW dbo.vw_ActiveTasksOverview
AS
SELECT 
    t.id AS task_id,
    t.title AS task_title,
    t.description AS task_description,
    t.priority,
    t.status,
    t.story_points,
    t.progress_percent,
    t.deadline,
    t.created_at AS task_created_at,
    
    -- Trạng thái quá hạn (Computed column)
    CASE 
        WHEN t.deadline < SYSUTCDATETIME() AND t.status <> N'Done' THEN 1 
        ELSE 0 
    END AS is_overdue,

    -- Thông tin Dự án
    p.id AS project_id,
    p.name AS project_name,
    p.project_code,
    
    -- Thông tin Sprint
    s.id AS sprint_id,
    s.name AS sprint_name,
    s.status AS sprint_status,

    -- Thông tin Người tạo
    creator.id AS creator_id,
    creator.full_name AS creator_name,
    creator.email AS creator_email,

    -- Danh sách người thực hiện (nối chuỗi STRING_AGG trong SQL Server)
    (
        SELECT STRING_AGG(emp.full_name, N', ')
        FROM dbo.task_assignments ta
        INNER JOIN dbo.employees emp ON ta.employee_id = emp.id
        WHERE ta.task_id = t.id AND emp.is_deleted = 0
    ) AS assignees_list

FROM dbo.tasks t
INNER JOIN dbo.projects p ON t.project_id = p.id
LEFT JOIN dbo.sprints s ON t.sprint_id = s.id AND s.is_deleted = 0
LEFT JOIN dbo.employees creator ON t.created_by = creator.id
WHERE t.is_deleted = 0 
  AND p.is_deleted = 0;
GO

-- ============================================================================
-- VIEW 2: vw_DepartmentWorkloadSummary
-- Mục đích: Báo cáo phân bổ tải công việc theo từng Phòng ban và Đội nhóm
-- ============================================================================
IF OBJECT_ID(N'dbo.vw_DepartmentWorkloadSummary', N'V') IS NOT NULL
    DROP VIEW dbo.vw_DepartmentWorkloadSummary;
GO

CREATE VIEW dbo.vw_DepartmentWorkloadSummary
AS
SELECT 
    d.id AS department_id,
    d.department_code,
    d.name AS department_name,
    mgr.full_name AS department_manager_name,
    
    COUNT(DISTINCT e.id) AS total_active_employees,
    COUNT(DISTINCT p.id) AS total_active_projects,
    COUNT(t.id) AS total_ongoing_tasks,
    COUNT(CASE WHEN t.status = N'Done' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.deadline < SYSUTCDATETIME() AND t.status <> N'Done' THEN 1 END) AS overdue_tasks,
    ISNULL(SUM(t.story_points), 0) AS total_workload_points

FROM dbo.departments d
LEFT JOIN dbo.employees mgr ON d.manager_id = mgr.id
LEFT JOIN dbo.employees e ON e.department_id = d.id AND e.is_active = 1 AND e.is_deleted = 0
LEFT JOIN dbo.projects p ON p.department_id = d.id AND p.is_deleted = 0
LEFT JOIN dbo.tasks t ON t.project_id = p.id AND t.is_deleted = 0
WHERE d.is_active = 1
GROUP BY 
    d.id, 
    d.department_code, 
    d.name, 
    mgr.full_name;
GO

-- ============================================================================
-- VIEW 3: vw_EmployeeAssignedWorkload
-- Mục đích: Phục vụ Project Manager cân bằng tải (Resource Allocation)
-- ============================================================================
IF OBJECT_ID(N'dbo.vw_EmployeeAssignedWorkload', N'V') IS NOT NULL
    DROP VIEW dbo.vw_EmployeeAssignedWorkload;
GO

CREATE VIEW dbo.vw_EmployeeAssignedWorkload
AS
SELECT 
    e.id AS employee_id,
    e.employee_code,
    e.full_name,
    e.email,
    d.name AS department_name,
    t_team.name AS team_name,
    
    COUNT(ta.task_id) AS total_assigned_tasks,
    COUNT(CASE WHEN t.status = N'In Progress' THEN 1 END) AS active_in_progress_tasks,
    COUNT(CASE WHEN t.status = N'Review' THEN 1 END) AS pending_review_tasks,
    COUNT(CASE WHEN t.deadline < SYSUTCDATETIME() AND t.status <> N'Done' THEN 1 END) AS overdue_tasks,
    ISNULL(SUM(CASE WHEN t.status <> N'Done' THEN t.story_points ELSE 0 END), 0) AS remaining_story_points

FROM dbo.employees e
LEFT JOIN dbo.departments d ON e.department_id = d.id
LEFT JOIN dbo.teams t_team ON e.team_id = t_team.id
LEFT JOIN dbo.task_assignments ta ON ta.employee_id = e.id
LEFT JOIN dbo.tasks t ON ta.task_id = t.id AND t.is_deleted = 0
WHERE e.is_active = 1 AND e.is_deleted = 0
GROUP BY 
    e.id, 
    e.employee_code, 
    e.full_name, 
    e.email, 
    d.name, 
    t_team.name;
GO

-- ============================================================================
-- VIEW 4 (HRM EXTENSIBILITY): vw_HRM_EmployeeLeaveAndContractOverview
-- Mục đích: Kết hợp thông tin Nhân sự, Hợp đồng lao động đang hiệu lực và
--           Quỹ phép năm còn lại phục vụ phân hệ HRM mở rộng sau này.
-- ============================================================================
IF OBJECT_ID(N'dbo.vw_HRM_EmployeeLeaveAndContractOverview', N'V') IS NOT NULL
    DROP VIEW dbo.vw_HRM_EmployeeLeaveAndContractOverview;
GO

CREATE VIEW dbo.vw_HRM_EmployeeLeaveAndContractOverview
AS
SELECT
    e.id AS employee_id,
    e.employee_code,
    e.full_name,
    e.email,
    e.job_title,
    e.employment_status,
    d.department_code,
    d.name AS department_name,
    tm.name AS team_name,
    ec.contract_code,
    ec.contract_type,
    ec.base_salary,
    ec.currency,
    ec.status AS contract_status,
    lb.leave_year,
    lb.annual_entitlement,
    lb.carried_over_days,
    lb.used_days,
    lb.remaining_days
FROM dbo.employees e
LEFT JOIN dbo.departments d ON e.department_id = d.id
LEFT JOIN dbo.teams tm ON e.team_id = tm.id
LEFT JOIN dbo.employment_contracts ec
    ON ec.employee_id = e.id
   AND ec.status = N'Active'
   AND ec.is_deleted = 0
LEFT JOIN dbo.leave_balances lb
    ON lb.employee_id = e.id
   AND lb.leave_year = YEAR(SYSUTCDATETIME())
WHERE e.is_active = 1
  AND e.is_deleted = 0;
GO

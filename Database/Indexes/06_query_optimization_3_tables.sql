-- ============================================================================
-- TaskSyncEnterprise — Tối Ưu Hóa 2 Câu Truy Vấn 3 Bảng (Cơ Bản -> Tối Ưu)
-- Hệ quản trị CSDL: Microsoft SQL Server
-- Yêu cầu môn học:
--   Chọn 2 câu lệnh truy vấn tra cứu có mối liên hệ 3 bảng và có điều kiện lọc
--   trên TỪNG bảng. Thực hiện:
--     Câu lệnh cơ bản -> Cây truy vấn cơ bản -> Cây truy vấn tối ưu -> Câu lệnh tối ưu
-- ============================================================================

IF DB_NAME() = N'master'
    USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- BÀI TOÁN 1 (WORK MANAGEMENT):
-- Tra cứu công việc (tasks) chưa hoàn thành, độ ưu tiên High/Urgent
-- thuộc các Sprint đang chạy (Active) của Dự án đang triển khai (In Progress, High).
--   * 3 bảng liên kết: dbo.projects (P) -> dbo.sprints (S) -> dbo.tasks (T)
--   * Điều kiện trên TỪNG bảng:
--       - P (projects): P.is_deleted = 0 AND P.status = N'In Progress' AND P.priority = N'High'
--       - S (sprints) : S.is_deleted = 0 AND S.status = N'Active'
--       - T (tasks)   : T.is_deleted = 0 AND T.status <> N'Done' AND T.priority IN (N'High', N'Urgent')
-- ============================================================================

PRINT N'--- [QUERY 1 - CƠ BẢN] Tích Đề-các & Lọc muộn ---';
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- 1.1. Câu lệnh truy vấn cơ bản (Dạng chuẩn trước tối ưu: Tích Đề-các + WHERE tổng hợp)
SELECT
    P.project_code,
    P.name AS project_name,
    S.name AS sprint_name,
    T.id AS task_id,
    T.title AS task_title,
    T.priority AS task_priority,
    T.status AS task_status,
    T.progress_percent,
    T.deadline
FROM dbo.projects P, dbo.sprints S, dbo.tasks T
WHERE P.id = S.project_id
  AND S.id = T.sprint_id
  AND P.is_deleted = 0
  AND P.status = N'In Progress'
  AND P.priority = N'High'
  AND S.is_deleted = 0
  AND S.status = N'Active'
  AND T.is_deleted = 0
  AND T.status <> N'Done'
  AND T.priority IN (N'High', N'Urgent');

PRINT N'--- [QUERY 1 - TỐI ƯU] Đẩy phép chọn (σ), phép chiếu (π) xuống sớm & dùng Covering/Filtered Index ---';

-- 1.2. Câu lệnh truy vấn tối ưu (Tương ứng với Cây truy vấn tối ưu)
WITH FilteredProjects AS (
    SELECT id, project_code, name
    FROM dbo.projects
    WHERE is_deleted = 0
      AND status = N'In Progress'
      AND priority = N'High'
),
FilteredSprints AS (
    SELECT id, project_id, name
    FROM dbo.sprints
    WHERE is_deleted = 0
      AND status = N'Active'
),
FilteredTasks AS (
    SELECT id, sprint_id, title, priority, status, progress_percent, deadline
    FROM dbo.tasks
    WHERE is_deleted = 0
      AND status <> N'Done'
      AND priority IN (N'High', N'Urgent')
)
SELECT
    P.project_code,
    P.name AS project_name,
    S.name AS sprint_name,
    T.id AS task_id,
    T.title AS task_title,
    T.priority AS task_priority,
    T.status AS task_status,
    T.progress_percent,
    T.deadline
FROM FilteredProjects P
INNER JOIN FilteredSprints S ON P.id = S.project_id
INNER JOIN FilteredTasks T ON S.id = T.sprint_id;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
GO

-- ============================================================================
-- BÀI TOÁN 2 (HRM EXTENSIBILITY):
-- Tra cứu đơn xin nghỉ phép (vacations) đang chờ duyệt ('Pending', 'Manager Approved')
-- của các Nhân viên đang làm việc thuộc Phòng ban đang hoạt động (DEPT-TECH).
--   * 3 bảng liên kết: dbo.departments (D) -> dbo.employees (E) -> dbo.vacations (V)
--   * Điều kiện trên TỪNG bảng:
--       - D (departments): D.is_active = 1 AND D.department_code = N'DEPT-TECH'
--       - E (employees)  : E.is_active = 1 AND E.is_deleted = 0
--       - V (vacations)  : V.is_deleted = 0 AND V.status IN (N'Pending', N'Manager Approved')
-- ============================================================================

PRINT N'--- [QUERY 2 - CƠ BẢN] Tích Đề-các & Lọc muộn ---';
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

-- 2.1. Câu lệnh truy vấn cơ bản (Tích Đề-các + WHERE tổng hợp)
SELECT
    D.department_code,
    D.name AS department_name,
    E.employee_code,
    E.full_name,
    E.job_title,
    V.id AS vacation_id,
    V.type AS leave_type,
    V.start_date,
    V.end_date,
    V.status AS vacation_status
FROM dbo.departments D, dbo.employees E, dbo.vacations V
WHERE D.id = E.department_id
  AND E.id = V.requested_by
  AND D.is_active = 1
  AND D.department_code = N'DEPT-TECH'
  AND E.is_active = 1
  AND E.is_deleted = 0
  AND V.is_deleted = 0
  AND V.status IN (N'Pending', N'Manager Approved');

PRINT N'--- [QUERY 2 - TỐI ƯU] Đẩy phép chọn (σ), phép chiếu (π) xuống sớm & dùng Covering/Filtered Index ---';

-- 2.2. Câu lệnh truy vấn tối ưu (Tương ứng với Cây truy vấn tối ưu)
WITH FilteredDepartments AS (
    SELECT id, department_code, name
    FROM dbo.departments
    WHERE is_active = 1
      AND department_code = N'DEPT-TECH'
),
FilteredEmployees AS (
    SELECT id, department_id, employee_code, full_name, job_title
    FROM dbo.employees
    WHERE is_active = 1
      AND is_deleted = 0
),
FilteredVacations AS (
    SELECT id, requested_by, type, start_date, end_date, status
    FROM dbo.vacations
    WHERE is_deleted = 0
      AND status IN (N'Pending', N'Manager Approved')
)
SELECT
    D.department_code,
    D.name AS department_name,
    E.employee_code,
    E.full_name,
    E.job_title,
    V.id AS vacation_id,
    V.type AS leave_type,
    V.start_date,
    V.end_date,
    V.status AS vacation_status
FROM FilteredDepartments D
INNER JOIN FilteredEmployees E ON D.id = E.department_id
INNER JOIN FilteredVacations V ON E.id = V.requested_by;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;
GO

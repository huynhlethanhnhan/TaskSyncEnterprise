-- ============================================================================
-- TaskSyncEnterprise — Bộ Câu Lệnh Truy Vấn Kiểm Chứng (Work Management + HRM)
-- Mục đích: Cho phép kiểm chứng trực tiếp trong SSMS hoặc sqlcmd đối với:
--   Q1: Đồng bộ Schema Backend-First (Alembic head & 5 bảng HRM + Soft-Delete)
--   Q2: Truy vấn Work Management đa bảng (Dept -> Team/Leader -> Project -> Sprint -> Task -> Assignee)
--   Q3: Ma trận phạm vi quyền (Admin, Manager theo phòng ban, Trưởng nhóm tạm thời theo Team)
--   Q4: Kiểm tra toàn vẹn quan hệ (phát hiện dữ liệu mồ côi / sai Project / double Active Sprint)
--   Q5: Quỹ phép năm (LeaveBalance), Đơn nghỉ phép & Xung đột Deadline công việc
--   Q6: Hợp đồng lao động, Chấm công & Yêu cầu Tăng ca (Overtime) liên kết Dự án
--   Q7: Kiểm chứng bảo mật Password Hash (bcrypt), Audit Logs & Backup History Logs
--   Q8: Đối chiếu câu lệnh tối ưu 3 bảng (kèm STATISTICS IO)
-- Lưu ý: Toàn bộ script chỉ sử dụng SELECT (Read-Only), KHÔNG làm thay đổi dữ liệu.
-- ============================================================================

IF DB_NAME() = N'master'
    USE TaskSyncEnterprise;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
GO

-- ============================================================================
-- Q1. KIỂM CHỨNG ĐỒNG BỘ SCHEMA & ALEMBIC HEAD
-- ============================================================================
PRINT N'=== [Q1] TRẠNG THÁI ALEMBIC & CÁC BẢNG CỐT LÕI (WORK + HRM) ===';

SELECT
    DB_NAME() AS database_name,
    (SELECT TOP 1 version_num FROM dbo.alembic_version) AS current_alembic_revision,
    (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) AS total_user_tables,
    CASE WHEN COL_LENGTH(N'dbo.vacations', N'is_deleted') IS NOT NULL THEN N'OK' ELSE N'MISSING' END AS vacations_soft_delete_col;

SELECT
    t.name AS table_name,
    p.rows AS row_count
FROM sys.tables t
INNER JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id IN (0, 1)
  AND t.is_ms_shipped = 0
  AND t.name IN (
      N'departments', N'teams', N'employees', N'projects', N'sprints',
      N'discussion_topics', N'tasks', N'task_assignments', N'vacations',
      N'leave_balances', N'employment_contracts', N'attendance_logs',
      N'overtime_requests', N'backup_history_logs', N'audit_logs'
  )
ORDER BY t.name;
GO

-- ============================================================================
-- Q2. TRUY VẤN WORK MANAGEMENT ĐA BẢNG (MÔ PHỎNG GET /api/v1/tasks/search)
-- Kết nối: departments -> teams -> projects -> sprints -> discussion_topics -> tasks -> task_assignments -> employees
-- ============================================================================
PRINT N'=== [Q2] TRUY VẤN ĐA BẢNG WORK MANAGEMENT (TOP 25 TASK ĐANG HOẠT ĐỘNG) ===';

SELECT TOP 25
    D.department_code,
    D.name AS department_name,
    MGR.full_name AS department_manager,
    TM.name AS team_name,
    LDR.full_name AS acting_team_leader,
    P.project_code,
    P.name AS project_name,
    S.name AS sprint_name,
    S.status AS sprint_status,
    DT.title AS epic_topic,
    T.id AS task_id,
    T.title AS task_title,
    T.priority,
    T.status AS task_status,
    T.progress_percent,
    T.deadline,
    STRING_AGG(ASSG.full_name, N', ') WITHIN GROUP (ORDER BY ASSG.full_name) AS assignees
FROM dbo.tasks T
INNER JOIN dbo.projects P ON P.id = T.project_id AND P.is_deleted = 0
LEFT JOIN dbo.departments D ON D.id = P.department_id
LEFT JOIN dbo.employees MGR ON MGR.id = D.manager_id AND MGR.is_deleted = 0
LEFT JOIN dbo.teams TM ON TM.id = P.team_id AND TM.is_active = 1
LEFT JOIN dbo.employees LDR ON LDR.id = TM.leader_id AND LDR.is_deleted = 0
LEFT JOIN dbo.sprints S ON S.id = T.sprint_id AND S.is_deleted = 0
LEFT JOIN dbo.discussion_topics DT ON DT.id = T.topic_id AND DT.is_deleted = 0
LEFT JOIN dbo.task_assignments TA ON TA.task_id = T.id
LEFT JOIN dbo.employees ASSG ON ASSG.id = TA.employee_id AND ASSG.is_deleted = 0
WHERE T.is_deleted = 0
GROUP BY
    D.department_code, D.name, MGR.full_name,
    TM.name, LDR.full_name,
    P.project_code, P.name,
    S.name, S.status, DT.title,
    T.id, T.title, T.priority, T.status, T.progress_percent, T.deadline
ORDER BY T.id DESC;
GO

-- ============================================================================
-- Q3. MA TRẬN PHÂN QUYỀN CONTEXTUAL (ADMIN / MANAGER PHÒNG BAN / TRƯỞNG NHÓM TẠM THỜI)
-- ============================================================================
PRINT N'=== [Q3] PHÂN TÍCH VAI TRÒ & PHẠM VI QUẢN LÝ CỦA TỪNG NHÂN SỰ ===';

SELECT
    E.id AS employee_id,
    E.employee_code,
    E.full_name,
    E.email,
    R.role_name AS system_role,
    D.department_code,
    T.name AS member_of_team,
    CASE WHEN DM.id IS NOT NULL THEN N'Department Manager (' + DM.department_code + N')' ELSE N'-' END AS dept_manager_scope,
    CASE WHEN TL.id IS NOT NULL THEN N'Acting Team Leader (' + TL.name + N')' ELSE N'-' END AS team_leader_scope,
    (
        SELECT COUNT(*)
        FROM dbo.projects P
        WHERE P.is_deleted = 0
          AND (
              E.role_id = 1
              OR (E.role_id = 2 AND P.department_id = E.department_id)
              OR (TL.id IS NOT NULL AND P.team_id = TL.id)
              OR EXISTS (SELECT 1 FROM dbo.project_members PM WHERE PM.project_id = P.id AND PM.employee_id = E.id)
          )
    ) AS accessible_projects_count
FROM dbo.employees E
INNER JOIN dbo.roles R ON R.id = E.role_id
LEFT JOIN dbo.departments D ON D.id = E.department_id
LEFT JOIN dbo.teams T ON T.id = E.team_id
LEFT JOIN dbo.departments DM ON DM.manager_id = E.id
LEFT JOIN dbo.teams TL ON TL.leader_id = E.id AND TL.is_active = 1
WHERE E.is_deleted = 0 AND E.is_active = 1
ORDER BY E.role_id ASC, D.department_code ASC, E.id ASC;
GO

-- ============================================================================
-- Q4. KIỂM TRA TOÀN VẸN QUAN HỆ WORK MANAGEMENT (KỲ VỌNG TẤT CẢ = 0 LỖI)
-- ============================================================================
PRINT N'=== [Q4] KIỂM TRA LỖI QUAN HỆ DỮ LIỆU WORK MANAGEMENT (MONG ĐỢI = 0) ===';

SELECT N'Task_Sprint_Khac_Project' AS integrity_check, COUNT(*) AS violation_count
FROM dbo.tasks T
INNER JOIN dbo.sprints S ON S.id = T.sprint_id
WHERE T.is_deleted = 0 AND S.is_deleted = 0 AND T.project_id <> S.project_id

UNION ALL

SELECT N'Task_Topic_Khac_Project' AS integrity_check, COUNT(*) AS violation_count
FROM dbo.tasks T
INNER JOIN dbo.discussion_topics DT ON DT.id = T.topic_id
WHERE T.is_deleted = 0 AND DT.is_deleted = 0 AND T.project_id <> DT.project_id

UNION ALL

SELECT N'Project_Nhieu_Hon_1_Active_Sprint' AS integrity_check, COUNT(*) AS violation_count
FROM (
    SELECT project_id
    FROM dbo.sprints
    WHERE is_deleted = 0 AND status = N'Active'
    GROUP BY project_id
    HAVING COUNT(*) > 1
) dup

UNION ALL

SELECT N'TaskAssignment_Tro_Toi_Task_Hoac_Emp_Da_Xoa' AS integrity_check, COUNT(*) AS violation_count
FROM dbo.task_assignments TA
LEFT JOIN dbo.tasks T ON T.id = TA.task_id
LEFT JOIN dbo.employees E ON E.id = TA.employee_id
WHERE T.id IS NULL OR T.is_deleted = 1 OR E.id IS NULL OR E.is_deleted = 1

UNION ALL

SELECT N'TeamLeader_Khac_PhongBan_Team' AS integrity_check, COUNT(*) AS violation_count
FROM dbo.teams TM
INNER JOIN dbo.employees E ON E.id = TM.leader_id
WHERE TM.is_active = 1 AND E.is_deleted = 0 AND TM.department_id <> ISNULL(E.department_id, -1);
GO

-- ============================================================================
-- Q5. TRUY VẤN HRM: QUỸ PHÉP NĂM (LEAVE BALANCE) & XUNG ĐỘT DEADLINE CÔNG VIỆC
-- ============================================================================
PRINT N'=== [Q5A] ĐỐI SOÁT QUỸ PHÉP NĂM & ĐƠN NGHỈ PHÉP (4 BẢNG) ===';

SELECT
    D.department_code,
    E.employee_code,
    E.full_name,
    LB.leave_year,
    LB.annual_entitlement,
    LB.carried_over_days,
    LB.used_days,
    LB.pending_days,
    (LB.annual_entitlement + LB.carried_over_days - LB.used_days - LB.pending_days) AS remaining_days,
    COUNT(V.id) AS active_leave_requests
FROM dbo.employees E
INNER JOIN dbo.departments D ON D.id = E.department_id
LEFT JOIN dbo.leave_balances LB ON LB.employee_id = E.id
LEFT JOIN dbo.vacations V ON V.requested_by = E.id AND V.is_deleted = 0
WHERE E.is_deleted = 0 AND E.is_active = 1
GROUP BY
    D.department_code, E.employee_code, E.full_name,
    LB.leave_year, LB.annual_entitlement, LB.carried_over_days,
    LB.used_days, LB.pending_days
ORDER BY D.department_code, E.employee_code;

PRINT N'=== [Q5B] PHÁT HIỆN XUNG ĐỘT NGHỈ PHÉP <-> DEADLINE TASK (LEAVE-TASK CONFLICTS) ===';

SELECT
    V.id AS vacation_id,
    E.employee_code,
    E.full_name,
    V.type AS leave_type,
    V.status AS leave_status,
    V.start_date,
    V.end_date,
    P.project_code,
    T.id AS conflicting_task_id,
    T.title AS task_title,
    T.status AS task_status,
    T.deadline AS task_deadline
FROM dbo.vacations V
INNER JOIN dbo.employees E ON E.id = V.requested_by AND E.is_deleted = 0
INNER JOIN dbo.task_assignments TA ON TA.employee_id = E.id
INNER JOIN dbo.tasks T ON T.id = TA.task_id AND T.is_deleted = 0
INNER JOIN dbo.projects P ON P.id = T.project_id AND P.is_deleted = 0
WHERE V.is_deleted = 0
  AND V.status IN (N'Pending', N'Manager Approved', N'HR Approved', N'Approved')
  AND T.status <> N'Done'
  AND T.deadline IS NOT NULL
  AND CAST(T.deadline AS DATE) BETWEEN V.start_date AND V.end_date
ORDER BY V.start_date, T.deadline;
GO

-- ============================================================================
-- Q6. TRUY VẤN HRM: HỢP ĐỒNG LAO ĐỘNG, CHẤM CÔNG & TĂNG CA LIÊN KẾT DỰ ÁN
-- ============================================================================
PRINT N'=== [Q6A] HỢP ĐỒNG LAO ĐỘNG HIỆU LỰC THEO PHÒNG BAN ===';

SELECT
    D.department_code,
    E.employee_code,
    E.full_name,
    EC.contract_code,
    EC.contract_type,
    EC.base_salary,
    EC.allowance,
    EC.currency,
    EC.start_date,
    EC.end_date,
    EC.status
FROM dbo.employment_contracts EC
INNER JOIN dbo.employees E ON E.id = EC.employee_id AND E.is_deleted = 0
LEFT JOIN dbo.departments D ON D.id = E.department_id
WHERE EC.is_deleted = 0
ORDER BY D.department_code, E.employee_code, EC.start_date DESC;

PRINT N'=== [Q6B] YÊU CẦU TĂNG CA (OVERTIME) GẮN VỚI DỰ ÁN & PHÊ DUYỆT 3 CẤP ===';

SELECT
    OT.id AS overtime_id,
    D.department_code,
    TM.name AS team_name,
    E.full_name AS employee_name,
    P.project_code,
    OT.work_date,
    OT.hours,
    OT.status,
    OT.team_leader_note,
    APP.full_name AS approved_by_name,
    OT.approved_at
FROM dbo.overtime_requests OT
INNER JOIN dbo.employees E ON E.id = OT.employee_id AND E.is_deleted = 0
LEFT JOIN dbo.departments D ON D.id = E.department_id
LEFT JOIN dbo.teams TM ON TM.id = E.team_id
LEFT JOIN dbo.projects P ON P.id = OT.project_id AND P.is_deleted = 0
LEFT JOIN dbo.employees APP ON APP.id = OT.approved_by
WHERE OT.is_deleted = 0
ORDER BY OT.work_date DESC, OT.id DESC;
GO

-- ============================================================================
-- Q7. KIỂM CHỨNG BẢO MẬT MẬT KHẨU (BCRYPT), AUDIT TRAIL & BACKUP LOGS
-- ============================================================================
PRINT N'=== [Q7A] KIỂM TRA ĐỊNH DẠNG BĂM MẬT KHẨU TRÊN DBO.EMPLOYEES ===';

SELECT
    CASE
        WHEN password_hash LIKE N'$2b$%' OR password_hash LIKE N'$2a$%' OR password_hash LIKE N'$2y$%' THEN N'BCRYPT_OK'
        WHEN password_hash IS NULL OR LTRIM(RTRIM(password_hash)) = N'' THEN N'EMPTY_INVALID'
        ELSE N'NON_BCRYPT_WARNING'
    END AS password_hash_status,
    COUNT(*) AS employee_count
FROM dbo.employees
WHERE is_deleted = 0
GROUP BY
    CASE
        WHEN password_hash LIKE N'$2b$%' OR password_hash LIKE N'$2a$%' OR password_hash LIKE N'$2y$%' THEN N'BCRYPT_OK'
        WHEN password_hash IS NULL OR LTRIM(RTRIM(password_hash)) = N'' THEN N'EMPTY_INVALID'
        ELSE N'NON_BCRYPT_WARNING'
    END;

PRINT N'=== [Q7B] 15 NHẬT KÝ AUDIT GẦN NHẤT & NHẬT KÝ BACKUP ===';

SELECT TOP 15
    id,
    employee_id,
    employee_email,
    action,
    timestamp
FROM dbo.audit_logs
ORDER BY id DESC;

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
-- Q8. ĐỐI CHIẾU TỐI ƯU HÓA TRUY VẤN 3 BẢNG (KÈM STATISTICS IO)
-- (Lưu ý: Dùng dữ liệu thực tế bất kỳ đang tồn tại trong TaskSyncEnterprise)
-- ============================================================================
PRINT N'=== [Q8] ĐỐI CHIẾU QUERY 3 BẢNG (PROJECTS -> SPRINTS -> TASKS) ===';
SET STATISTICS IO ON;

-- 8A. Câu lệnh cơ bản (Tích Đề-các + WHERE tổng hợp)
SELECT
    P.project_code,
    P.name AS project_name,
    S.name AS sprint_name,
    T.id AS task_id,
    T.title AS task_title,
    T.priority AS task_priority,
    T.status AS task_status
FROM dbo.projects P, dbo.sprints S, dbo.tasks T
WHERE P.id = S.project_id
  AND S.id = T.sprint_id
  AND P.is_deleted = 0
  AND P.status IN (N'In Progress', N'Planning', N'Active')
  AND S.is_deleted = 0
  AND S.status IN (N'Active', N'Planned')
  AND T.is_deleted = 0
  AND T.status <> N'Done'
  AND T.priority IN (N'High', N'Urgent');

-- 8B. Câu lệnh tối ưu (Đẩy phép chọn σ & phép chiếu π xuống từng CTE trước khi JOIN)
WITH FilteredProjects AS (
    SELECT id, project_code, name
    FROM dbo.projects
    WHERE is_deleted = 0
      AND status IN (N'In Progress', N'Planning', N'Active')
),
FilteredSprints AS (
    SELECT id, project_id, name
    FROM dbo.sprints
    WHERE is_deleted = 0
      AND status IN (N'Active', N'Planned')
),
FilteredTasks AS (
    SELECT id, sprint_id, title, priority, status
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
    T.status AS task_status
FROM FilteredProjects P
INNER JOIN FilteredSprints S ON P.id = S.project_id
INNER JOIN FilteredTasks T ON S.id = T.sprint_id;

SET STATISTICS IO OFF;
GO

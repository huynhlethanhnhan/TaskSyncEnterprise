# Quan Hệ Giữa Các Module & Dữ Liệu (Module Relationships)

Tài liệu này mô tả chi tiết sơ đồ quan hệ thực thể (ERD) và cấu trúc liên kết giữa các bảng trong hệ thống **TaskSyncEnterprise**.

---

## 1. Sơ Đồ Thực Thể Cơ Cấu Tổ Chức (Organization ERD)

```mermaid
erDiagram
    DEPARTMENT ||--o{ TEAM : "contains"
    DEPARTMENT ||--o{ EMPLOYEE : "has members"
    DEPARTMENT }|--o| EMPLOYEE : "managed by (manager_id)"
    TEAM ||--o{ EMPLOYEE : "has members"
    TEAM }|--o| EMPLOYEE : "led by (leader_id)"

    DEPARTMENT {
        int id PK
        nvarchar_255 name
        nvarchar_50 code
        int manager_id FK "Nullable"
        boolean is_active
    }

    TEAM {
        int id PK
        nvarchar_255 name
        int department_id FK
        int leader_id FK "Nullable"
        boolean is_active
    }

    EMPLOYEE {
        int id PK
        nvarchar_50 employee_code
        nvarchar_255 full_name
        nvarchar_255 email
        int role_id FK
        int department_id FK "Nullable"
        int team_id FK "Nullable"
        boolean is_active
        boolean is_deleted
    }
```

---

## 2. Sơ Đồ Thực Thể Quản Lý Công Việc Agile (Work Management ERD)

```mermaid
erDiagram
    PROJECT ||--o{ PROJECT_MEMBER : "members"
    PROJECT ||--o{ SPRINT : "sprints"
    PROJECT ||--o{ TOPIC : "epics/topics"
    PROJECT ||--o{ BACKLOG_ITEM : "backlog"
    PROJECT ||--o{ TASK : "tasks"

    TOPIC ||--o{ BACKLOG_ITEM : "categorizes"
    TOPIC ||--o{ TASK : "categorizes"
    SPRINT ||--o{ BACKLOG_ITEM : "schedules"
    SPRINT ||--o{ TASK : "schedules"

    BACKLOG_ITEM |o--o| TASK : "converts to (task_id)"

    TASK ||--o{ TASK_ASSIGNMENT : "assignments"
    TASK ||--o{ TASK_CHECKLIST : "checklists"
    TASK ||--o{ TASK_COMMENT : "comments"
    TASK ||--o{ FILE_ATTACHMENT : "attachments"

    EMPLOYEE ||--o{ PROJECT_MEMBER : "participates"
    EMPLOYEE ||--o{ TASK_ASSIGNMENT : "assigned"

    PROJECT {
        int id PK
        nvarchar_255 name
        nvarchar_50 project_code
        int department_id FK "Nullable"
        int team_id FK "Nullable"
        int created_by FK
        boolean is_deleted
    }

    SPRINT {
        int id PK
        int project_id FK
        nvarchar_255 name
        nvarchar_50 status "Planned | Active | Completed"
        boolean is_deleted
    }

    TOPIC {
        int id PK
        int project_id FK
        nvarchar_255 title
        boolean is_deleted
    }

    BACKLOG_ITEM {
        int id PK
        int project_id FK
        int sprint_id FK "Nullable"
        int topic_id FK "Nullable"
        int task_id FK "Nullable"
        nvarchar_255 title
        nvarchar_50 priority "Low | Medium | High | Urgent"
        nvarchar_50 status "Backlog | In Sprint"
        int story_points
        boolean is_deleted
    }

    TASK {
        int id PK
        int project_id FK
        int sprint_id FK "Nullable"
        int topic_id FK "Nullable"
        nvarchar_255 title
        nvarchar_50 status "To Do | In Progress | Review | Done"
        nvarchar_50 priority "Low | Medium | High | Urgent"
        int story_points
        boolean is_deleted
    }
```

---

## 3. Quy Tắc Toàn Vẹn Dữ Liệu & Ràng Buộc (Integrity Rules)

1. **Chuẩn Unicode MS SQL Server**:
   - Tất cả các trường văn bản tiếng Việt sử dụng kiểu dữ liệu `NVARCHAR` và literal `N'...'` trong SQL.
   - Thời gian sử dụng chuẩn UTC `SYSUTCDATETIME()`.
2. **Xóa Mềm (Soft Deletion)**:
   - Các bảng kế thừa từ `AuditMixin` không bao giờ sử dụng câu lệnh SQL `DELETE` trực tiếp.
   - Khi xóa, cập nhật `is_deleted = True` và ghi lại thời điểm `deleted_at = SYSUTCDATETIME()`.
3. **Phân Rã Quan Hệ N–N**:
   - Quan hệ `Task` và `Employee` thông qua bảng trung gian `TaskAssignment` (`task_id`, `employee_id`).
   - Quan hệ `Project` và `Employee` thông qua bảng trung gian `ProjectMember` (`project_id`, `employee_id`).
4. **Không Có Circular Dependency**:
   - `Department` chứa `Team`, `Team` chứa `Employee`.
   - `Team Leader` là tham chiếu `leader_id` nullable trỏ về `Employee`, không tạo vòng lặp phụ thuộc cứng trong khóa ngoại.

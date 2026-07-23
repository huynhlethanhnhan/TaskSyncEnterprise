# TaskSyncEnterprise — Phase 4.4 Manual Test Guide

**Document Version:** 1.0.0  
**Phase:** Phase 4.4 Quality Assurance & Manual Testing  

---

## 1. Authentication Credentials for QA Testing

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@gmail.com` | `123456` | Full CRUD access to all modules, drawers, and user administration |

---

## 2. Manual Test Suites & Verification Steps

### Test Suite 1: Dashboard Integration
1. Login with `admin@gmail.com` / `123456`.
2. Verify page navigates to `/dashboard`.
3. Confirm real metric counters render:
   - Total Employees count matches backend DB.
   - Active Projects count matches backend DB.
   - Task completion percentage calculates correctly.
4. Click "Cập nhật Live" button and verify data refetches without page reload.

### Test Suite 2: Projects Module CRUD & Filters
1. Navigate to `/projects`.
2. Type a search term in the search bar and confirm filtering.
3. Select status filter dropdown ("Active", "Completed") and verify grid updates.
4. Click "Tạo Dự án Mới" button -> `ProjectDrawer` slides out.
5. Fill project name and click "Tạo Mới". Verify toast alert appears and grid updates.
6. Click "Sửa" on a project card -> update status to "Completed" and save.
7. Click a project card -> navigate to `/projects/:id` and verify task completion progress bar.

### Test Suite 3: Tasks Module View Toggle & Kanban
1. Navigate to `/tasks`.
2. Toggle between "Kanban" and "Bảng (Table)" views using top header button.
3. On Kanban view, change a task's status dropdown from "To Do" to "In Progress". Confirm task moves to middle column.
4. Apply priority filter ("High") and verify tasks filter in real-time.
5. Click "+ Tạo Task Mới" -> fill details in `TaskDrawer` and save.

### Test Suite 4: Employees Directory & Department Breakdown
1. Navigate to `/employees`.
2. Verify `Avatar`, full name, email, department name, role badge, and active status pill display correctly.
3. Search by employee name or filter by department.
4. Click "Thêm Nhân viên Mới" -> create a staff account with email `testuser@company.com`.
5. Verify pagination controls (10 items per page) function properly.

### Test Suite 5: Departments & Notifications
1. Navigate to `/departments` -> verify headcount calculation per department card.
2. Navigate to `/notifications` -> click "Chưa đọc" tab.
3. Click "Đánh dấu tất cả là đã đọc" -> verify unread badge badge turns green and header badge clears.

### Test Suite 6: Profile & Password Security
1. Navigate to `/profile`.
2. Edit full name or job title -> click "Lưu Thay đổi" -> verify success toast.
3. Click "Đổi Mật khẩu" -> enter current password `123456` and a new password -> confirm success toast.

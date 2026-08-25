# TaskSyncEnterprise - Nền Tảng Quản Lý Công Việc & Dự Án Doanh Nghiệp

[![Release Candidate](https://img.shields.io/badge/Release%20Candidate-v1.0.0--RC1-blue.svg)](docs/reports/ANTIGRAVITY_FINAL_RELEASE_REVIEW.md)
[![Backend Pytest](https://img.shields.io/badge/Backend%20Pytest-437%20Passed-success.svg)](docs/reports/CODEX_FINAL_AUDIT.md)

## 1. Tổng Quan Dự Án

**TaskSyncEnterprise** là nền tảng quản lý công việc và dự án enterprise đa người dùng (multi-tenant, role-based) được xây dựng cho các đội ngũ phát triển phần mềm theo mô hình Agile/Scrum.
Nền tảng kết hợp chặt chẽ giữa **Cơ cấu Tổ chức Doanh nghiệp** (Phòng ban -> Nhóm -> Nhân viên) và **Quản lý Công việc Agile** (Dự án -> Thành viên -> Sprint -> Topic/Epic -> Backlog -> Task -> TaskAssignment -> Kanban).

Hệ thống được thiết kế với độ bảo mật cao, phân quyền RBAC (Role-Based Access Control) nghiêm ngặt nhằm đảm bảo dữ liệu của các phòng ban không bị chồng chéo. Trưởng phòng quản lý dự án chỉ được cấp quyền trong giới hạn dự án phụ trách, và nhân viên chỉ tương tác với các công việc được giao.

## 2. Kiến Trúc & Công Nghệ

- **Backend**: Python 3.12+, FastAPI, Uvicorn
- **Database**: MS SQL Server 2022, SQLAlchemy 2.0, Alembic, Redis
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack React Query

Chi tiết thiết kế kiến trúc và mô hình dữ liệu có tại: [SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md)

## 3. Roadmap Phát Triển (Các Tính Năng Tiếp Theo)

Khi có thêm thời gian, hệ thống sẽ tiếp tục được mở rộng với các tính năng sau:

1. **Hoàn thiện AI Agent Tích hợp (Task Assistant):**
   - Hỗ trợ tóm tắt Project/Sprint, tự động gợi ý chia nhỏ Task từ Epic.
   - Trợ lý nhắc nhở deadline và đưa ra cảnh báo rủi ro về tiến độ (Burndown chart analysis).

2. **Tích Hợp Sâu Core HRM (Human Resource Management):**
   - Đồng bộ hồ sơ nhân sự, chấm công và quản lý ngày nghỉ trực tiếp vào Resource Capacity của các Sprint.
   - Bổ sung luồng "Phê duyệt" (Approval Workflow) từ Manager cho các dự án quan trọng.

3. **Báo Cáo Nâng Cao & Export (Advanced Analytics):**
   - Export dữ liệu Kanban/Sprint ra định dạng PDF/Excel theo chuẩn báo cáo C-level.
   - Thêm các biểu đồ Velocity, Gantt chart nâng cao với các Dependencies logic phức tạp.

4. **Webhooks & External Integrations:**
   - Kết nối với Github/Gitlab để tự động link commit vào Task.
   - Bắn thông báo (Notification) qua Slack/Teams.

---
*Lưu ý: Mọi hướng dẫn chạy source code, Docker và chi tiết fix lỗi kỹ thuật được đặt ở nhánh develop dành cho đội ngũ lập trình viên.*

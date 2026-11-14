# TaskSyncEnterprise — Hướng Dẫn Triển Khai Database-First Trên SQL Server

Thư mục này chứa toàn bộ các kịch bản T-SQL thuần được thiết kế theo chuẩn **Database-First** trên Microsoft SQL Server, hỗ trợ đồng thời **Quản lý Công việc Agile** và **Mở rộng Nhân sự (HRM)** kèm cơ chế **Sao lưu (Backup) & Phục hồi (Rollback)**.

---

## 📂 Cấu trúc thư mục

```text
Database/
├── Scripts/
│   ├── 01_create_tables_and_constraints.sql   # DDL 19 bảng (Work + HRM), PK/FK/UQ/CK/DF đặt tên cụ thể & 3 SQL Server RULE
│   └── 02_seed_initial_data.sql               # Dữ liệu mẫu idempotent cho cả Work Management & HRM
├── Triggers/
│   └── 02_triggers.sql                        # 6 Triggers T-SQL (Soft-Delete, Audit Trail, Agile, HRM Cursor & Rollback quỹ phép)
├── Procedures/
│   ├── 03_stored_procedures.sql               # 6 Stored Procedures (Thống kê, Burndown, Đóng Sprint ACID, Cursor quá hạn, Rollback Savepoint, Backup)
│   └── 04_views.sql                           # 4 Views toàn cục (Soft-Delete, Tải phòng ban, Nhân viên, HRM Hợp đồng & Phép năm)
├── Indexes/
│   ├── 05_query_optimization_indexes.sql      # B-Tree FK, Covering Index (INCLUDE), Filtered Index
│   └── 06_query_optimization_3_tables.sql     # 2 bài toán truy vấn 3 bảng: Câu cơ bản vs Câu tối ưu + STATISTICS IO/TIME
├── Verification/
│   └── 07_test_and_demo_scenarios.sql         # Bộ 13 Test Case tự động kiểm chứng toàn bộ Rule, Trigger, Store, View, Rollback, Backup
└── Backup/
    └── 08_backup_and_restore_strategy.sql     # Chiến lược Full/Differential Backup, Point-in-Time Restore & Rollback
```

---

## 🚀 Thứ tự thực thi trên SQL Server (SSMS / sqlcmd)

Mở **SQL Server Management Studio (SSMS)**, kết nối vào server `localhost` (hoặc container SQL Server của dự án), mở các file theo thứ tự sau và nhấn **Execute (F5)**:

1. **Bước 1**: [`Database/Scripts/01_create_tables_and_constraints.sql`](Scripts/01_create_tables_and_constraints.sql) -> Tạo 19 bảng, ràng buộc đặt tên tường minh và 3 `RULE`.
2. **Bước 2**: [`Database/Triggers/02_triggers.sql`](Triggers/02_triggers.sql) -> Cài đặt 6 Trigger T-SQL.
3. **Bước 3**: [`Database/Procedures/03_stored_procedures.sql`](Procedures/03_stored_procedures.sql) -> Cài đặt 6 Stored Procedures.
4. **Bước 4**: [`Database/Procedures/04_views.sql`](Procedures/04_views.sql) -> Cài đặt 4 Views.
5. **Bước 5**: [`Database/Indexes/05_query_optimization_indexes.sql`](Indexes/05_query_optimization_indexes.sql) -> Tạo bộ chỉ mục tối ưu hóa.
6. **Bước 6**: [`Database/Scripts/02_seed_initial_data.sql`](Scripts/02_seed_initial_data.sql) -> Nạp dữ liệu mẫu Work Management + HRM.
7. **Bước 7**: [`Database/Indexes/06_query_optimization_3_tables.sql`](Indexes/06_query_optimization_3_tables.sql) -> Chạy đối chiếu 2 câu truy vấn 3 bảng (bật `Ctrl + M` để xem Execution Plan).
8. **Bước 8**: [`Database/Verification/07_test_and_demo_scenarios.sql`](Verification/07_test_and_demo_scenarios.sql) -> Chạy kiểm thử tự động toàn bộ TC01–TC13.
9. **Bước 9 (Tùy chọn DBA)**: [`Database/Backup/08_backup_and_restore_strategy.sql`](Backup/08_backup_and_restore_strategy.sql) -> Thực hiện Full Backup & xác minh file sao lưu.

# TaskSyncEnterprise — Hướng Dẫn Triển Khai Database-First Trên SQL Server

Thư mục này chứa toàn bộ các kịch bản T-SQL thuần được thiết kế theo chuẩn **Database-First** phục vụ báo cáo môn học Quản trị hệ thống CSDL và triển khai trên Microsoft SQL Server.

---

## 📂 Cấu trúc thư mục

```text
Database/
├── Scripts/
│   ├── 01_create_tables_and_constraints.sql   # DDL tạo bảng, PK, FK, CHECK constraints, DEFAULT
│   └── 02_seed_initial_data.sql               # Dữ liệu mẫu chuẩn hóa để demo báo cáo
├── Triggers/
│   └── 03_business_and_audit_triggers.sql     # Bộ Trigger T-SQL: Audit Log, Soft-Delete, Agile rules
├── Procedures/
│   ├── 04_stored_procedures.sql               # Stored Procedures nghiệp vụ và tối ưu hóa
│   └── 05_views.sql                           # Views truy vấn toàn cục tự động áp dụng Soft-Delete
├── Indexes/
│   └── 06_query_optimization_indexes.sql      # B-Tree, Covering Index, Filtered Index
└── Verification/
    └── 07_test_and_demo_scenarios.sql         # Kịch bản kiểm thử & demo trực tiếp trước Giảng viên
```

---

## 🚀 Thứ tự thực thi trên SQL Server (SSMS)

Mở **SQL Server Management Studio (SSMS)**, kết nối vào server `localhost` (hoặc container SQL Server của dự án), mở các file theo thứ tự sau và nhấn **Execute (F5)**:

1. **Bước 1**: Mở `Database/Scripts/01_create_tables_and_constraints.sql` -> Execute.
2. **Bước 2**: Mở `Database/Triggers/02_triggers.sql` -> Execute.
3. **Bước 3**: Mở `Database/Procedures/03_stored_procedures.sql` -> Execute.
4. **Bước 4**: Mở `Database/Procedures/04_views.sql` -> Execute.
5. **Bước 5**: Mở `Database/Indexes/05_query_optimization_indexes.sql` -> Execute.
6. **Bước 6**: Mở `Database/Scripts/02_seed_initial_data.sql` -> Execute để nạp dữ liệu mẫu.
7. **Bước 7**: Mở `Database/Verification/07_test_and_demo_scenarios.sql` -> Chạy từng Demo để chuẩn bị kịch bản thuyết trình.

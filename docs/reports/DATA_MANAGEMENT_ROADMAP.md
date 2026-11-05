# Roadmap báo cáo và học Quản lý dữ liệu hệ thống CNTT

## 1. Mục tiêu

Tài liệu này dùng TaskSyncEnterprise làm ví dụ để học cách kiểm kê, quản trị và tối ưu dữ liệu trong một ứng dụng doanh nghiệp. Trọng tâm là hiểu dữ liệu đang được định nghĩa ở đâu, quy tắc nào bảo vệ dữ liệu, cách truy vấn có kiểm soát và cách đánh giá hiệu năng trước khi đề xuất thay đổi.

Phạm vi hiện tại là khảo sát và hướng dẫn thực hành chỉ đọc. Không thêm trigger, thay đổi schema, tạo index hoặc chỉnh sửa dữ liệu.

## 2. Bức tranh hiện tại của dự án

- Database chính là Microsoft SQL Server; backend dùng SQLAlchemy 2.0 và Alembic để quản lý schema qua migration.
- ORM models nằm trong `backend/app/models/`; migration nằm trong `backend/alembic/versions/`.
- Quy ước schema `dbo` được khai báo tại `backend/app/models/base.py`.
- Quan hệ nghiệp vụ và một số quy tắc dữ liệu đã được mô tả trong [MODULE_RELATIONSHIP.md](../architecture/MODULE_RELATIONSHIP.md).
- Ứng dụng có theo dõi thời gian thực thi câu SQL trong [query_monitor.py](../../backend/app/database/query_monitor.py): cảnh báo truy vấn trên 500 ms và ghi metrics. Đây là SQLAlchemy event listeners ở tầng ứng dụng, **không phải SQL Server trigger**.
- Dashboard [database-overview.json](../../monitoring/grafana/dashboards/Database/database-overview.json) tập trung vào hành vi giữa ứng dụng và database; mô tả dashboard nêu rõ nó không cung cấp số liệu nội bộ SQL Server.
- Trong mã nguồn đã khảo sát chưa tìm thấy câu lệnh tạo SQL Server trigger. Chưa thể kết luận database đang chạy không có trigger, vì trigger có thể được tạo trực tiếp trên môi trường database mà không nằm trong repository.

## 3. Bản đồ nơi cần tìm thông tin dữ liệu

| Nội dung | Vị trí chính | Cần đọc/đối chiếu |
|---|---|---|
| Bảng, cột, kiểu dữ liệu, quan hệ ORM | `backend/app/models/` | `__tablename__`, `mapped_column`, `ForeignKey`, `relationship` |
| Schema đang áp dụng | `backend/alembic/versions/` | `upgrade()` và `downgrade()`; migration mới nhất |
| Quy ước quan hệ nghiệp vụ | [MODULE_RELATIONSHIP.md](../architecture/MODULE_RELATIONSHIP.md) | ERD, quan hệ N–N, soft delete, Unicode, thời gian |
| Rule đầu vào/API | `backend/app/schemas/`, `backend/app/routers/` | Pydantic validators, kiểm tra đầu vào, quyền truy cập |
| Rule nghiệp vụ | `backend/app/services/`, `backend/app/crud/` | Điều kiện trước/sau thao tác, trạng thái và giao dịch |
| Constraint và index ở tầng database | ORM models + Alembic + catalog SQL Server | PK, FK, UNIQUE, CHECK, DEFAULT, index; xác minh schema thật |
| Query timing và metrics ứng dụng | `backend/app/database/query_monitor.py`, `backend/app/monitoring/` | Ngưỡng chậm, loại query, thời lượng, lỗi |
| Dashboard | `monitoring/grafana/dashboards/Database/` | Metrics ứng dụng; phân biệt với số liệu SQL Server engine |

## 4. Roadmap thực hiện báo cáo

### Giai đoạn 1 — Kiểm kê dữ liệu và đối chiếu kiến trúc

1. Liệt kê các bảng thật trong database theo schema.
2. Xuất danh mục cột, kiểu dữ liệu, nullability, khóa chính và khóa ngoại.
3. Phân nhóm dữ liệu theo miền: tổ chức/nhân viên, dự án/Agile, tài khoản và phiên, thông báo, audit/cấu hình.
4. Đối chiếu ba nguồn: ORM models, Alembic migrations và catalog của SQL Server.
5. Đánh dấu sai khác hoặc nội dung cần xác minh; không tự xem ERD hay model là bằng chứng schema production đang giống hệt.

**Kết quả học:** biết phân biệt mô hình được khai báo trong code với schema đã triển khai thực tế.

### Giai đoạn 2 — Lập bản đồ trigger và rule

Phân loại theo nơi thực thi:

1. **Database constraints:** `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `DEFAULT`, `NOT NULL`.
2. **Rule ứng dụng:** kiểm tra ở schema/API/service như quyền thao tác, trạng thái workflow, soft delete hoặc điều kiện nghiệp vụ.
3. **SQL Server trigger:** chạy bên trong database khi có thao tác `INSERT`, `UPDATE` hoặc `DELETE`; cần kiểm tra trực tiếp `sys.triggers` trên đúng database.
4. **SQLAlchemy events:** hook chạy ở tiến trình ứng dụng; ví dụ hiện có đo thời gian query. Không nên gọi đây là database trigger.

Mỗi rule trong báo cáo chi tiết sẽ có: tên rule, bảng/cột hoặc nghiệp vụ liên quan, nơi thực thi, mục đích, hậu quả khi vi phạm, và cách kiểm thử.

**Kết quả học:** biết chọn đúng tầng đặt quy tắc; không đưa mọi rule vào trigger vì trigger khó quan sát hơn và có thể gây tác động ngoài dự kiến.

### Giai đoạn 3 — Bộ truy vấn kiểm kê và thực hành đọc dữ liệu

Cung cấp các truy vấn SQL Server chỉ đọc để:

- Liệt kê bảng và cột.
- Liệt kê quan hệ khóa ngoại.
- Kiểm tra constraint, index và trigger.
- Đếm số bản ghi từng bảng.
- Xem một số dòng có giới hạn và truy vấn JOIN dựa trên ERD.

Không khuyến nghị dump toàn bộ bản ghi bằng `SELECT *` trên production. Nên dùng tài khoản read-only, môi trường development/staging, giới hạn dòng, tránh cột nhạy cảm, và kiểm tra tải trước khi chạy count chính xác trên bảng lớn.

**Kết quả học:** biết xem cấu trúc và dữ liệu mà không nhầm “toàn bộ bảng” với “đọc không giới hạn mọi bản ghi”.

### Giai đoạn 4 — Query optimization có đo lường

1. Chọn truy vấn đại diện từ API/report, trước tiên là truy vấn chậm hoặc tốn nhiều lượt gọi.
2. Ghi baseline: thời gian, số dòng, logical reads, số lượt gọi DB và execution plan.
3. Kiểm tra predicate, JOIN, phân trang, N+1, projection cột và tính chọn lọc của index.
4. Đối chiếu index hiện có với các truy vấn thực tế; đánh giá chi phí ghi và dung lượng trước khi đề xuất index mới.
5. So sánh trước/sau trên cùng dữ liệu và cách đo; chỉ đề xuất thay đổi có bằng chứng.
6. Phân biệt metrics ứng dụng hiện tại (query duration, lỗi, ngưỡng cảnh báo 500 ms) với DMV, Query Store và execution plan của SQL Server.

**Kết quả học:** tối ưu theo evidence, không thêm index theo cảm tính.

### Giai đoạn 5 — Hoàn thiện báo cáo và bài học

Báo cáo chi tiết sau khi hoàn tất khảo sát sẽ gồm:

1. Tóm tắt kiến trúc dữ liệu và ERD.
2. Danh mục bảng/cột/quan hệ và sai khác giữa model, migration, database.
3. Ma trận constraint, rule nghiệp vụ và trigger.
4. Bộ SQL thực hành kèm giải thích và cảnh báo an toàn.
5. Đánh giá theo dõi query hiện có và kế hoạch tối ưu dựa trên số liệu.
6. Thứ tự học: schema → khóa/quan hệ → rule/transaction → truy vấn → index/plan → giám sát và vận hành.

## 5. SQL Server thực hành

Chạy các truy vấn dưới đây trong đúng database cần khảo sát. Tài khoản nên chỉ có quyền đọc metadata và dữ liệu cần thiết.

### 5.1 Liệt kê bảng

```sql
SELECT
    s.name AS schema_name,
    t.name AS table_name
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name;
```

### 5.2 Liệt kê cột và kiểu dữ liệu

```sql
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    c.column_id,
    c.name AS column_name,
    ty.name AS data_type,
    CASE
        WHEN ty.name IN ('nvarchar', 'nchar') AND c.max_length <> -1
            THEN c.max_length / 2
        WHEN c.max_length = -1 THEN -1
        ELSE c.max_length
    END AS max_length,
    c.is_nullable,
    c.is_identity
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.columns AS c ON c.object_id = t.object_id
JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id
WHERE t.is_ms_shipped = 0
ORDER BY s.name, t.name, c.column_id;
```

### 5.3 Liệt kê khóa ngoại

```sql
SELECT
    fk.name AS foreign_key_name,
    s_from.name AS from_schema,
    t_from.name AS from_table,
    c_from.name AS from_column,
    s_to.name AS to_schema,
    t_to.name AS to_table,
    c_to.name AS to_column,
    fk.delete_referential_action_desc AS on_delete
FROM sys.foreign_keys AS fk
JOIN sys.foreign_key_columns AS fkc
    ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables AS t_from ON t_from.object_id = fkc.parent_object_id
JOIN sys.schemas AS s_from ON s_from.schema_id = t_from.schema_id
JOIN sys.columns AS c_from
    ON c_from.object_id = fkc.parent_object_id
   AND c_from.column_id = fkc.parent_column_id
JOIN sys.tables AS t_to ON t_to.object_id = fkc.referenced_object_id
JOIN sys.schemas AS s_to ON s_to.schema_id = t_to.schema_id
JOIN sys.columns AS c_to
    ON c_to.object_id = fkc.referenced_object_id
   AND c_to.column_id = fkc.referenced_column_id
ORDER BY s_from.name, t_from.name, fk.name;
```

### 5.4 Kiểm tra trigger trong database hiện tại

```sql
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    tr.name AS trigger_name,
    tr.is_disabled,
    tr.is_instead_of_trigger,
    OBJECT_DEFINITION(tr.object_id) AS trigger_definition
FROM sys.triggers AS tr
JOIN sys.tables AS t ON t.object_id = tr.parent_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE tr.parent_class = 1
ORDER BY s.name, t.name, tr.name;
```

Kết quả rỗng chỉ cho biết không có DML trigger gắn với bảng trong database đang kết nối; không chứng minh database khác hoặc loại trigger khác không tồn tại. Cần xác nhận đúng server/database và quyền xem metadata.

### 5.5 Đếm bản ghi từng bảng (count chính xác)

Script này đọc toàn bộ bảng để đếm, do đó có thể tốn thời gian trên database lớn. Chạy ngoài giờ cao điểm hoặc dùng ước lượng metadata nếu chỉ cần số gần đúng.

```sql
CREATE TABLE #TableCounts (
    schema_name sysname NOT NULL,
    table_name sysname NOT NULL,
    row_count bigint NOT NULL
);

DECLARE @SchemaName sysname;
DECLARE @TableName sysname;
DECLARE @Sql nvarchar(max);

DECLARE table_cursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT s.name, t.name
    FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name;

OPEN table_cursor;
FETCH NEXT FROM table_cursor INTO @SchemaName, @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @Sql =
        N'INSERT INTO #TableCounts (schema_name, table_name, row_count) ' +
        N'SELECT @schema, @table, COUNT_BIG(*) FROM ' +
        QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName) + N';';

    EXEC sys.sp_executesql
        @Sql,
        N'@schema sysname, @table sysname',
        @schema = @SchemaName,
        @table = @TableName;

    FETCH NEXT FROM table_cursor INTO @SchemaName, @TableName;
END;

CLOSE table_cursor;
DEALLOCATE table_cursor;

SELECT schema_name, table_name, row_count
FROM #TableCounts
ORDER BY schema_name, table_name;

DROP TABLE #TableCounts;
```

### 5.6 Xem dữ liệu có giới hạn

Thay tên bảng/cột theo danh mục vừa kiểm kê. Không chọn cột nhạy cảm nếu không cần:

```sql
SELECT TOP (100)
    id,
    name
FROM dbo.projects
ORDER BY id;
```

Không dùng `ORDER BY` trên cột không có index khi bảng lớn nếu chỉ cần xem mẫu; và không chạy mẫu này cho đến khi xác nhận bảng có các cột tương ứng.

### 5.7 Xem index và trạng thái

```sql
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    i.name AS index_name,
    i.type_desc,
    i.is_primary_key,
    i.is_unique,
    i.is_disabled,
    i.is_hypothetical
FROM sys.indexes AS i
JOIN sys.tables AS t ON t.object_id = i.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE t.is_ms_shipped = 0
  AND i.index_id > 0
ORDER BY s.name, t.name, i.index_id;
```

## 6. Nguyên tắc khi diễn giải kết quả

- ORM model là định nghĩa trong ứng dụng; migration là lịch sử thay đổi; catalog SQL Server là trạng thái của database đang kết nối. Cần đối chiếu cả ba.
- Trigger chỉ nên được đề xuất khi rule phải được thực thi cho mọi client ghi vào database và không thể bảo đảm ở tầng phù hợp hơn. Cần đánh giá side effects, thứ tự thực thi, transaction và khả năng vận hành.
- `COUNT(*)` chính xác phải đọc dữ liệu; thống kê partition/DMV có thể nhanh hơn nhưng thường chỉ là ước lượng hoặc có điều kiện.
- `SELECT TOP` giới hạn số dòng trả về nhưng không tự động bảo đảm truy vấn nhẹ; predicate, sort và index vẫn quan trọng.
- Không công bố dữ liệu cá nhân trong ảnh chụp, log hoặc báo cáo; nên dùng dữ liệu giả lập/đã ẩn danh khi học.

## 7. Tiêu chí hoàn thành báo cáo chi tiết

- Có danh sách schema/table/column/PK/FK được lấy từ database mục tiêu và ghi rõ thời điểm, môi trường.
- Mỗi rule được gắn với vị trí thực thi và bằng chứng (model, migration, code nghiệp vụ hoặc catalog DB).
- Tuyên bố về trigger được giới hạn đúng database đã kiểm tra.
- Mọi khuyến nghị tối ưu nêu baseline, cách đo, trade-off và bước xác minh; chưa có số liệu thì ghi là câu hỏi cần đo, không trình bày như kết luận.
- Các truy vấn thực hành không sửa dữ liệu và có cảnh báo về tải/quyền truy cập.

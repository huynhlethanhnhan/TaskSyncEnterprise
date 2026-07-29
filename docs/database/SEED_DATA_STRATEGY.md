# Chiến lược Seed Data

## Mục tiêu hiện tại

`backend/Seed_Example.py` tạo bộ dữ liệu demo có liên kết thật để kiểm tra Work Manager:

- khoảng 20 nhân sự theo Admin/Manager/Employee;
- phòng ban và team có leader;
- project có thành viên;
- mỗi project có Epic/Topic, Product Backlog, Sprint và Task;
- Task có assignment, checklist, comment;
- notification, vacation và audit log;
- quan hệ Project → Epic → Backlog/Task → Sprint nhất quán.

Chạy:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe Seed_Example.py --reset
```

`--reset` xóa dữ liệu ứng dụng hiện tại trước khi seed. Chỉ dùng cho local/test, không dùng production.

## Ma trận dữ liệu nên mở rộng

| Dataset | Quy mô kế tiếp | Mục đích |
|---|---:|---|
| Department | 6–8 | thống kê liên phòng ban |
| Team | 2–3/phòng ban | leader và phân quyền chéo |
| Employee | 100 / 1.000 / 10.000 | pagination và hiệu năng |
| Project | 3–5/phòng ban | portfolio |
| Epic | 3–6/project | phân nhóm backlog |
| Sprint | tối thiểu 3/project | velocity và reopen |
| Backlog Item | 30–100/project | ranking/capacity |
| Task | 100–1.000/project | Kanban, realtime và filter |
| Attachment/Comment | nhiều kích thước | storage/collaboration |
| Vacation | giao nhau theo ngày | calendar và approval |

## Thiết kế seed thế hệ tiếp theo

1. Tách `seed/plans/` khỏi persistence.
2. Cho phép `--profile small|medium|large|ai`.
3. Dùng random seed cố định để kết quả tái lập.
4. Sinh ngày tương đối quanh ngày hiện tại để Calendar luôn có dữ liệu.
5. Có validator sau seed kiểm tra count, foreign key và invariant Agile.
6. Có chế độ append không phá dữ liệu và chế độ reset có xác nhận môi trường.
7. Sinh dữ liệu lịch sử Sprint snapshot để phục vụ velocity/burndown.

## Dataset dành cho AI

Profile `ai` trong tương lai nên tạo:

- lịch sử thời gian hoàn thành Task;
- kỹ năng và tải công việc nhân viên;
- estimate ban đầu so với actual;
- blocker, comment và thay đổi trạng thái;
- Sprint success/failure label;
- dữ liệu đã ẩn danh và không chứa PII thật.

AI chỉ được huấn luyện/đánh giá trên dữ liệu synthetic hoặc đã được đồng ý sử dụng.

# Engineering Learnings tổng hợp

## 1. Cấu hình là một phần của kiến trúc

- Dùng một nguồn cấu hình có validation thay vì đọc environment rải rác.
- Secret yếu phải fail-fast ở production.
- Hostname trong Docker khác localhost trên host.
- Health phải tách liveness và readiness để biết ứng dụng sống nhưng dependency chưa sẵn sàng.

## 2. Database và migration

- SQLAlchemy model không thay thế Alembic migration.
- SQL Server container chỉ tạo server và `sa`; database nghiệp vụ cần bước bootstrap riêng.
- Seed phải chạy sau migration và phải kiểm tra invariant, không chỉ đếm row.
- Quan hệ tổ chức và Agile cần foreign key rõ để tránh dữ liệu “có hiển thị nhưng không kết nối”.

## 3. API và bảo mật

- UI permission không phải security boundary.
- Mọi mutation cần kiểm tra ownership/project membership/role tại backend.
- Error response cần ổn định nhưng không lộ stack trace hoặc database details.
- Upload phải kiểm tra quyền, đường dẫn và loại/giới hạn file.

## 4. Cache và realtime

- SQL Server là source of truth; cache có thể mất mà dữ liệu vẫn đúng.
- Invalidate cache phải đi cùng mutation sau commit.
- Realtime đầy đủ cần cả hai phía: backend phát domain event và frontend invalidate đúng query key.
- Component giữ state riêng ngoài React Query phải nghe domain event hoặc được refactor dùng query chung.
- Hai browser context là bài test chính xác hơn một tab vì nó phát hiện cache cục bộ giả realtime.

## 5. Frontend

- Một design system chỉ hữu ích khi spacing, Card và typography được dùng ở component dùng chung.
- Giữ song song `.jsx` cũ và `.tsx` mới tạo dead code và làm audit sai; phải xóa bản đã bị thay thế.
- Avatar/file upload nên cập nhật cache ngay để UI phản hồi tức thời, sau đó vẫn refetch từ server.
- Chức năng cài đặt phải nối Provider thật; animation chờ giả làm người dùng nghĩ có đồng bộ server.

## 6. Agile domain

- Project là phạm vi; Epic/Topic là nhóm giá trị lớn; Backlog Item là User Story; Task là đơn vị thực thi; Sprint là timebox.
- Mọi selector Sprint/Epic phải lọc theo Project hiện tại.
- Workflow cần trả lỗi 409 có thông điệp nghiệp vụ rõ khi trạng thái xung đột.

## 7. Docker và vận hành

- Compose phải không chứa default password.
- Dependency “healthy” chưa đủ nếu database nghiệp vụ chưa tồn tại; cần init one-shot.
- Named volume bảo vệ dữ liệu nhưng cũng làm seed/reset khó đoán nếu không có hướng dẫn rõ.
- Log/evidence runtime không nên commit lâu dài; giữ test tự động để tái tạo bằng chứng.

## 8. Quy tắc cho các vòng phát triển sau

1. Bắt đầu bug bằng vòng lặp red/green tái tạo đúng triệu chứng.
2. Viết regression test trước fix tại seam phù hợp.
3. Chạy static dead-code scan trước mỗi release.
4. Cập nhật tài liệu tổng hợp thay vì tạo thêm report theo phase.
5. Luôn kiểm tra native local và Docker như hai topology khác nhau.

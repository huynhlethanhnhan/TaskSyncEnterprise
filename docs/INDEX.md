# Tài liệu kỹ thuật TaskSyncEnterprise

Thư mục này là nguồn tài liệu kỹ thuật duy nhất của nhánh `develop`. Các báo cáo theo phase, ảnh bằng chứng cũ và thư mục `reports/`, `roadmap/` ở root đã được hợp nhất để tránh trùng lặp.

## Đọc theo nhu cầu

| Mục tiêu | Tài liệu |
|---|---|
| Hiểu toàn bộ hệ thống | [Kiến trúc phần mềm](architecture/SYSTEM_ARCHITECTURE.md) |
| Chạy code khi phát triển | [Môi trường develop](development/DEVELOPMENT_GUIDE.md) |
| Chạy bằng Docker hoặc máy local | [Docker, SQL Server và localhost](deployment/DOCKER_DATABASE_GUIDE.md) |
| Hiểu nghiệp vụ Project–Epic–Sprint–Task | [Mô hình nghiệp vụ](architecture/DOMAIN_MODEL.md) |
| Tạo dữ liệu kiểm thử | [Chiến lược Seed Data](database/SEED_DATA_STRATEGY.md) |
| Xem kinh nghiệm kỹ thuật đã tích lũy | [Engineering Learnings](learning/ENGINEERING_LEARNINGS.md) |
| Xem kết quả audit hiện tại | [Báo cáo tổng hợp](reports/CONSOLIDATED_AUDIT.md) |
| Tiếp tục dự án và tích hợp AI | [Roadmap tiếp theo](roadmap/AI_PRODUCT_ROADMAP.md) |

## Quy ước nhánh

- `master`: bản giới thiệu ổn định và hướng dẫn cài đặt trong `README.md`.
- `develop`: mã đang phát triển cùng toàn bộ tài liệu kỹ thuật trong thư mục này.
- GitHub không hỗ trợ quyền xem riêng theo nhánh. Muốn chỉ chủ repository thấy `develop`, repository phải private hoặc giới hạn quyền ở cấp repository.

## Nguyên tắc duy trì

1. Không tạo lại báo cáo theo từng phase nếu thông tin có thể cập nhật vào tài liệu tổng hợp.
2. Diagram phải dùng Mermaid để review được bằng Git.
3. Mọi lệnh Docker phải nói rõ chạy ở host hay trong container.
4. Mọi hướng dẫn database phải phân biệt SQL Server có sẵn và SQL Server do Docker tạo.
5. Báo cáo runtime chỉ ghi kết quả và ngày kiểm tra; không commit log, ảnh test hoặc token.

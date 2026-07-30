# TaskSyncEnterprise — Develop

Nhánh `develop` chứa mã đang phát triển và tài liệu kỹ thuật chuyên sâu. Phần giới thiệu sản phẩm và hướng dẫn cài đặt dành cho người dùng nằm trong `README.md` của nhánh `master`.

## Tài liệu kỹ thuật

Bắt đầu tại [docs/INDEX.md](docs/INDEX.md):

- kiến trúc modular monolith và các Mermaid diagram;
- domain Project–Epic–Backlog–Sprint–Task;
- hướng dẫn phát triển và kiểm thử;
- Docker, SQL Server, Redis và localhost;
- chiến lược Seed Data;
- Engineering Learnings và báo cáo audit hợp nhất;
- roadmap mở rộng sản phẩm và tích hợp AI.

## Quality gate

```powershell
cd backend
.\.venv\Scripts\ruff.exe check app tests
.\.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Không đưa `.env`, secret, runtime log, evidence image, build output hoặc database backup vào Git.

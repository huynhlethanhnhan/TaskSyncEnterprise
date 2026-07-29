# Hướng dẫn phát triển

## Quy trình nhánh

```text
develop -> test/audit -> pull request -> master
```

- Phát triển và tài liệu kỹ thuật: `develop`.
- `master`: bản ổn định có README cài đặt; không lưu báo cáo phase.
- Không commit trực tiếp `.env`, log, build output, ảnh test runtime hoặc database backup.

## Chạy local

Yêu cầu: Python 3.12, Node.js 22+, npm, SQL Server 2022 và Redis; hoặc Docker Desktop.

```powershell
Copy-Item .env.example .env
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Terminal khác:

```powershell
cd frontend
npm ci
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://127.0.0.1:8000/api/v1`. Swagger: `http://127.0.0.1:8000/docs`.

## Kiểm tra bắt buộc

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

Kịch bản realtime cần backend và frontend đang chạy:

```powershell
npm run test:e2e:realtime
```

## Checklist khi thêm feature

1. Model/migration nếu thay schema.
2. Pydantic schema và validation.
3. Service/CRUD giữ business rule.
4. Router kiểm tra authentication/RBAC.
5. Cache invalidation và domain event sau commit.
6. API service, hook query và UI permission.
7. Regression test backend + frontend contract.
8. Cập nhật đúng một tài liệu tổng hợp, không tạo report phase mới.

## Quy ước chất lượng

- Không `console.log`, `debugger`, `print` trong runtime code.
- Không giữ file `.jsx` cũ khi đã có phiên bản `.tsx`.
- Không export helper/hook nếu không có caller.
- Không hardcode secret/password trong Compose.
- Comment giải thích lý do hoặc invariant, không diễn giải lại từng dòng code.

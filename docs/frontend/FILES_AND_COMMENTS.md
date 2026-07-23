# TaskSyncEnterprise — Files & Comments Integration

This document details the file upload workspace and task details collaboration.

---

## 📎 1. File Uploads & Attachments

- **Endpoint Integration:** `/tasks/{task_id}/attachments` (Upload) and `/tasks/{task_id}/attachments/{attachment_id}` (Delete).
- **Behavior:** Files are processed by the backend `StorageService` and saved physical path metadata is stored in SQL Server.
- **Redesigned UI:** Embedded inside the task details drawer, displaying file name, size, download link, and delete action.

---

## 💬 2. Discussion & Comments (Backend Gap)

- **Backend Status:** The database includes a `task_comments` table, but there are no router endpoints or schemas defined in FastAPI.
- **UI Details:** Redesigned comments feed placeholder displays proposed FastAPI contract details and database parameters.

# 📂 FILE: app/routers/v1/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.database import get_db
from app.models.task import Task
from app.core.deps import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/progress")
def get_project_progress(db: Session = Depends(get_db)):
    # 1. Đếm tổng số task chưa bị xóa (is_deleted = 0)
    total_tasks = db.execute(
        select(func.count(Task.id)).where(Task.is_deleted == False)
    ).scalar() or 0
    
    if total_tasks == 0:
        return {"progress_percent": 0, "todo": 0, "in_progress": 0, "done": 0, "total": 0}

    # 2. Đếm số task theo đúng các trạng thái (status) trong Model của bạn
    todo_count = db.execute(select(func.count(Task.id)).where(Task.status == "To Do", Task.is_deleted == False)).scalar() or 0
    in_progress_count = db.execute(select(func.count(Task.id)).where(Task.status == "In Progress", Task.is_deleted == False)).scalar() or 0
    done_count = db.execute(select(func.count(Task.id)).where(Task.status == "Done", Task.is_deleted == False)).scalar() or 0

    # 3. Tính phần trạng tiến độ tổng quan dựa trên các task đã "Done"
    progress_percent = round((done_count / total_tasks) * 100, 2)

    return {
        "progress_percent": progress_percent,
        "todo": todo_count,
        "in_progress": in_progress_count,
        "done": done_count,
        "total": total_tasks
    }
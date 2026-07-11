from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


def get_all(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    project_id: int | None = None,
    status: str | None = None
):

    stmt = select(Task).where(Task.is_deleted == False)
    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    if status is not None:
        stmt = stmt.where(Task.status == status)

    stmt = stmt.order_by(Task.id.desc()).offset(skip).limit(limit)

    return db.scalars(stmt).all()



def get_by_id(db: Session, task_id: int):

    return db.get(
        Task,
        task_id
    )


def create(db: Session, data: TaskCreate):
    task_data = data.model_dump()
    assigned_to = task_data.pop("assigned_to", None)

    obj = Task(**task_data)
    db.add(obj)
    db.commit()
    db.refresh(obj)

    if assigned_to is not None:
        from app.models.task_assignment import TaskAssignment
        assignment = TaskAssignment(task_id=obj.id, employee_id=assigned_to)
        db.add(assignment)
        db.commit()
        
        # KÍCH HOẠT TRIGGER NOTIFICATION
        from app.crud import notification as notification_crud
        try:
            notification_crud.create_notification(
                db,
                title="Bạn có task mới",
                message=obj.title,
                employee_id=assigned_to
            )
        except Exception as e:
            print(f"Error creating notification: {e}")

        db.refresh(obj)

    return obj


def update(db: Session,
           obj: Task,
           data: TaskUpdate):

    task_data = data.model_dump(exclude_unset=True)
    assigned_to = task_data.pop("assigned_to", None)

    old_status = obj.status
    for k, v in task_data.items():
        setattr(obj, k, v)
    db.commit()

    if "assigned_to" in data.model_fields_set:
        from app.models.task_assignment import TaskAssignment
        from sqlalchemy import delete
        
        # Lưu lại người được gán cũ
        old_assigned_to = obj.assigned_to
        
        # Xóa các assignments cũ
        db.execute(delete(TaskAssignment).where(TaskAssignment.task_id == obj.id))
        
        if assigned_to is not None:
            new_assignment = TaskAssignment(task_id=obj.id, employee_id=assigned_to)
            db.add(new_assignment)
            db.commit()
            
            # KÍCH HOẠT TRIGGER NOTIFICATION (Nếu gán cho người mới hoặc người được gán thay đổi)
            if old_assigned_to != assigned_to:
                from app.crud import notification as notification_crud
                try:
                    notification_crud.create_notification(
                        db,
                        title="Bạn có task mới",
                        message=obj.title,
                        employee_id=assigned_to
                    )
                except Exception as e:
                    print(f"Error creating notification: {e}")
        else:
            db.commit()

    # KÍCH HOẠT NOTIFICATION KHI THAY ĐỔI TRẠNG THÁI TASK
    new_status = obj.status
    if old_status != new_status and obj.assigned_to is not None:
        from app.crud import notification as notification_crud
        try:
            notification_crud.create_notification(
                db,
                title="Thay đổi trạng thái Task",
                message=f"Task '{obj.title}' đã chuyển sang trạng thái '{new_status}'",
                employee_id=obj.assigned_to
            )
        except Exception as e:
            print(f"Error creating status notification: {e}")

    db.refresh(obj)
    return obj


def delete(db: Session,
           obj: Task):

    obj.is_deleted = True

    db.commit()

def get_by_project(db: Session, project_id: int):
    stmt = (
        select(Task)
        .where(Task.project_id == project_id) # 🟢 Chỉ lấy task thuộc dự án này
        .where(Task.is_deleted == False)
        .order_by(Task.id.desc())
    )
    return db.scalars(stmt).all()

def get_my_tasks(db: Session, employee_id: int):
    from app.models.task_assignment import TaskAssignment
    stmt = (
        select(Task)
        .join(TaskAssignment, Task.id == TaskAssignment.task_id)
        .where(TaskAssignment.employee_id == employee_id)
        .where(Task.is_deleted == False)
        .order_by(Task.id.desc())
    )
    return db.scalars(stmt).all()
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def get_all(db: Session, skip: int = 0, limit: int = 100, search: str | None = None):
    stmt = select(Department)

    # Chỉ lấy các phòng ban chưa bị xóa (Soft Delete)
    stmt = stmt.where(Department.is_active == True)

    # Tính năng Search theo Name hoặc Department Code
    if search:
        stmt = stmt.where(
            or_(
                Department.name.icontains(search),
                Department.department_code.icontains(search),
            )
        )

    # Tính năng Pagination & Sắp xếp mới nhất lên đầu
    stmt = stmt.order_by(Department.id.desc()).offset(skip).limit(limit)
    return db.scalars(stmt).all()


def get_by_id(db: Session, department_id: int):
    # Đảm bảo phòng ban đó vẫn đang active
    stmt = select(Department).where(
        Department.id == department_id, Department.is_active == True
    )
    return db.scalar(stmt)


def create(db: Session, data: DepartmentCreate):
    obj = Department(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update(db: Session, obj: Department, data: DepartmentUpdate):
    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Department):
    # Triển khai chuẩn Soft Delete: Thay vì db.delete(obj), ta chuyển trạng thái hoạt động
    obj.is_active = False
    db.commit()

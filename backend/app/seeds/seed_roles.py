from sqlalchemy.orm import Session
from app.models.role import Role
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE

ROLES_DATA = [
    {"id": ROLE_ADMIN, "name": "Admin", "description": "Quản trị viên toàn quyền hệ thống"},
    {"id": ROLE_MANAGER, "name": "Manager", "description": "Quản lý dự án và phòng ban"},
    {"id": ROLE_EMPLOYEE, "name": "Employee", "description": "Nhân viên thực thi công việc"},
]


def seed_roles(db: Session) -> int:
    count = 0
    for rdata in ROLES_DATA:
        role = db.get(Role, rdata["id"])
        if not role:
            role = Role(id=rdata["id"], role_name=rdata["name"], description=rdata["description"])
            db.add(role)
            count += 1
        else:
            role.role_name = rdata["name"]
            role.description = rdata["description"]
    db.commit()
    return count

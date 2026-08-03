from sqlalchemy.orm import Session
from app.models.department import Department

DEPARTMENTS_DATA = [
    {
        "department_code": "DEP-IT",
        "name": "Information Technology",
        "description": "Phát triển hạ tầng CNTT và phần mềm enterprise",
    },
    {
        "department_code": "DEP-HR",
        "name": "Human Resources",
        "description": "Quản trị nhân sự, đào tạo và chính sách phúc lợi",
    },
    {
        "department_code": "DEP-FIN",
        "name": "Finance",
        "description": "Quản lý tài chính, ngân sách và kế toán doanh nghiệp",
    },
    {
        "department_code": "DEP-MKT",
        "name": "Marketing",
        "description": "Truyền thông, phát triển thương hiệu và tiếp thị",
    },
    {
        "department_code": "DEP-OPS",
        "name": "Operations",
        "description": "Vận hành hệ thống và quy trình sản xuất kinh doanh",
    },
]


def seed_departments(db: Session) -> list[Department]:
    departments = []
    for ddata in DEPARTMENTS_DATA:
        dep = (
            db.query(Department)
            .filter_by(department_code=ddata["department_code"])
            .first()
        )
        if not dep:
            dep = Department(
                department_code=ddata["department_code"],
                name=ddata["name"],
                description=ddata["description"],
                is_active=True,
            )
            db.add(dep)
            db.commit()
            db.refresh(dep)
        departments.append(dep)
    return departments

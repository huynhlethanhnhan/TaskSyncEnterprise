import random
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.department import Department
from app.models.team import Team
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER, ROLE_EMPLOYEE
from app.core.security import get_password_hash

DEFAULT_PASSWORD_HASH = get_password_hash("TaskSync@2026")


def seed_employees(
    db: Session,
    departments: list[Department],
    teams: list[Team] | None = None,
) -> list[Employee]:
    random.seed(2026)
    dep_ids = [d.id for d in departments] if departments else [1]
    team_by_department = {team.department_id: team.id for team in teams or []}

    employees_specs = []

    # 2 Admins
    employees_specs.append(
        {
            "employee_code": "admin001",
            "full_name": "Quản Trị Viên Tổng (Admin 001)",
            "email": "admin001@enterprise.com",
            "role_id": ROLE_ADMIN,
            "department_id": dep_ids[0],
        }
    )
    employees_specs.append(
        {
            "employee_code": "admin002",
            "full_name": "Quản Trị Phụ Trách (Admin 002)",
            "email": "admin002@enterprise.com",
            "role_id": ROLE_ADMIN,
            "department_id": dep_ids[0],
        }
    )

    # Common Vietnamese names
    vn_first_names = [
        "Nguyễn",
        "Trần",
        "Lê",
        "Phạm",
        "Hoàng",
        "Huỳnh",
        "Phan",
        "Vũ",
        "Võ",
        "Đặng",
        "Bùi",
        "Đỗ",
        "Hồ",
        "Ngô",
        "Dương",
        "Lý",
    ]
    vn_middle_names = [
        "Thị",
        "Văn",
        "Hữu",
        "Thanh",
        "Minh",
        "Thu",
        "Ngọc",
        "Hồng",
        "Đức",
        "Công",
        "Xuân",
        "Hải",
        "Tuấn",
        "Hoài",
        "Quang",
    ]
    vn_last_names = [
        "An",
        "Anh",
        "Bảo",
        "Châu",
        "Chi",
        "Dũng",
        "Dương",
        "Đạt",
        "Giang",
        "Hà",
        "Hải",
        "Hiếu",
        "Hòa",
        "Huy",
        "Khang",
        "Khánh",
        "Khoa",
        "Kiên",
        "Lâm",
        "Linh",
        "Long",
        "Mai",
        "Nam",
        "Nga",
        "Ngọc",
        "Nhi",
        "Nhung",
        "Phong",
        "Phúc",
        "Phương",
        "Quân",
        "Quang",
        "Quyên",
        "Sơn",
        "Thảo",
        "Thắng",
        "Thành",
        "Thủy",
        "Tiên",
        "Trang",
        "Trí",
        "Tú",
        "Tuấn",
        "Uyên",
        "Vân",
        "Việt",
        "Vy",
        "Yến",
    ]

    def generate_name():
        return f"{random.choice(vn_first_names)} {random.choice(vn_middle_names)} {random.choice(vn_last_names)}"

    # 5 Managers
    for i in range(1, 6):
        code = f"manager{i:03d}"
        employees_specs.append(
            {
                "employee_code": code,
                "full_name": f"{generate_name()} ({code})",
                "email": f"{code}@enterprise.com",
                "role_id": ROLE_MANAGER,
                "department_id": dep_ids[i % len(dep_ids)],
            }
        )

    # 25 Employees
    for i in range(1, 26):
        code = f"employee{i:03d}"
        employees_specs.append(
            {
                "employee_code": code,
                "full_name": f"{generate_name()} ({code})",
                "email": f"{code}@enterprise.com",
                "role_id": ROLE_EMPLOYEE,
                "department_id": dep_ids[(i - 1) % len(dep_ids)],
            }
        )

    created_employees = []
    for spec in employees_specs:
        emp = db.query(Employee).filter_by(employee_code=spec["employee_code"]).first()
        if not emp:
            emp = Employee(
                employee_code=spec["employee_code"],
                full_name=spec["full_name"],
                email=spec["email"],
                password_hash=DEFAULT_PASSWORD_HASH,
                role_id=spec["role_id"],
                department_id=spec["department_id"],
                team_id=team_by_department.get(spec["department_id"]),
                is_active=True,
                is_deleted=False,
            )
            db.add(emp)
            db.commit()
            db.refresh(emp)
        created_employees.append(emp)

    return created_employees

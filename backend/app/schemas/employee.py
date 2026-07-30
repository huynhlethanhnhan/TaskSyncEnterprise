from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class EmployeeBase(BaseModel):

    full_name: str
    email: EmailStr

    phone: str | None = None
    gender: str | None = None
    address: str | None = None

    date_of_birth: date | None = None
    start_date: date | None = None

    department_id: int | None = None
    team_id: int | None = None
    role_id: int

    manager_id: int | None = None

    job_title: str | None = None


class EmployeeCreate(EmployeeBase):
    employee_code: str | None = None
    password: str


class EmployeeUpdate(BaseModel):

    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    department_id: int | None = None
    team_id: int | None = None
    role_id: int | None = None
    manager_id: int | None = None
    job_title: str | None = None
    is_active: bool | None = None
    gender: str | None = None
    address: str | None = None
    date_of_birth: date | None = None


class EmployeeResponse(EmployeeBase):

    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime
    last_login: datetime | None = None
    last_logout: datetime | None = None
    login_count: int = 0
    is_first_login: bool = False
    department_name: str | None = None
    team_name: str | None = None

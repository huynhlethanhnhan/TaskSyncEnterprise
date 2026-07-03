from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))

    employees = relationship("Employee", back_populates="role")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))

    teams = relationship("Team", back_populates="department")
    employees = relationship("Employee", back_populates="department")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("dbo.departments.id"), nullable=False)
    team_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))

    department = relationship("Department", back_populates="teams")
    employees = relationship("Employee", back_populates="team")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    gender: Mapped[str | None] = mapped_column(String(10))
    address: Mapped[str | None] = mapped_column(String(500))
    date_of_birth: Mapped[Date | None] = mapped_column(Date)
    start_date: Mapped[Date | None] = mapped_column(Date)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("dbo.departments.id"))
    team_id: Mapped[int | None] = mapped_column(ForeignKey("dbo.teams.id"))
    role_id: Mapped[int] = mapped_column(ForeignKey("dbo.roles.id"), nullable=False)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("dbo.employees.id"))
    job_title: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("1"))
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))
    updated_at: Mapped[str | None] = mapped_column(DateTime)

    role = relationship("Role", back_populates="employees")
    department = relationship("Department", back_populates="employees")
    team = relationship("Team", back_populates="employees")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[Date | None] = mapped_column(Date)
    end_date: Mapped[Date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("N'Planning'"))
    priority: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("N'Medium'"))
    budget: Mapped[float | None] = mapped_column(Numeric(18, 2))
    progress_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, server_default=text("0"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("dbo.employees.id"))
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))
    updated_at: Mapped[str | None] = mapped_column(DateTime)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("dbo.projects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("N'Medium'"))
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default=text("N'To Do'"))
    story_points: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    progress_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, server_default=text("0"))
    deadline: Mapped[str | None] = mapped_column(DateTime)
    started_at: Mapped[str | None] = mapped_column(DateTime)
    completed_at: Mapped[str | None] = mapped_column(DateTime)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("dbo.employees.id"))
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[str] = mapped_column(DateTime, nullable=False, server_default=text("SYSUTCDATETIME()"))
    updated_at: Mapped[str | None] = mapped_column(DateTime)
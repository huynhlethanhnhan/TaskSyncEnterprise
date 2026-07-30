from datetime import datetime
from pydantic import BaseModel, Field


class UserPreferenceBase(BaseModel):
    theme: str = Field(default="system")
    language: str = Field(default="vi")
    timezone: str = Field(default="Asia/Ho_Chi_Minh")
    date_format: str = Field(default="DD/MM/YYYY")
    page_size: int = Field(default=20, ge=5, le=100)
    compact_mode: bool = Field(default=False)
    in_app_notifications: bool = Field(default=True)
    email_notifications: bool = Field(default=True)
    task_assigned_notify: bool = Field(default=True)
    task_deadline_notify: bool = Field(default=True)
    sprint_status_notify: bool = Field(default=True)
    project_update_notify: bool = Field(default=True)


class UserPreferenceUpdate(BaseModel):
    theme: str | None = None
    language: str | None = None
    timezone: str | None = None
    date_format: str | None = None
    page_size: int | None = Field(default=None, ge=5, le=100)
    compact_mode: bool | None = None
    in_app_notifications: bool | None = None
    email_notifications: bool | None = None
    task_assigned_notify: bool | None = None
    task_deadline_notify: bool | None = None
    sprint_status_notify: bool | None = None
    project_update_notify: bool | None = None


class UserPreferenceResponse(UserPreferenceBase):
    employee_id: int
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SystemSettingBase(BaseModel):
    system_name: str = Field(default="TaskSync Enterprise")
    default_sprint_capacity: int = Field(default=30, ge=1, le=200)
    default_task_page_size: int = Field(default=20, ge=5, le=1000)
    deadline_reminder_days: int = Field(default=3, ge=1, le=30)
    allow_employee_status_update: bool = Field(default=True)
    maintenance_mode: bool = Field(default=False)


class SystemSettingUpdate(BaseModel):
    system_name: str | None = None
    default_sprint_capacity: int | None = Field(default=None, ge=1, le=200)
    default_task_page_size: int | None = Field(default=None, ge=5, le=1000)
    deadline_reminder_days: int | None = Field(default=None, ge=1, le=30)
    allow_employee_status_update: bool | None = None
    maintenance_mode: bool | None = None


class SystemSettingResponse(SystemSettingBase):
    updated_at: datetime | None = None
    updated_by: int | None = None

    class Config:
        from_attributes = True

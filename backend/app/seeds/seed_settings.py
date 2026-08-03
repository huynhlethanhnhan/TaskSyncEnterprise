from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.crud import crud_setting
from app.schemas.setting import SystemSettingUpdate, UserPreferenceUpdate


def seed_settings(db: Session, employees: list[Employee]) -> int:
    admin = next((e for e in employees if e.role_id == 1), employees[0])

    # 1. System Settings
    crud_setting.update_system_settings(
        db,
        SystemSettingUpdate(
            system_name="TaskSync Enterprise Platform",
            default_sprint_capacity=30,
            default_task_page_size=20,
            deadline_reminder_days=3,
            allow_employee_status_update=True,
            maintenance_mode=False,
        ),
        updated_by_id=admin.id,
    )

    # 2. User Preferences for test employees
    count = 0
    for emp in employees:
        crud_setting.get_user_preference(db, emp.id)
        count += 1

    db.commit()
    return count

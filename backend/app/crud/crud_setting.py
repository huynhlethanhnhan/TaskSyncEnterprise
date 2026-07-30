import json
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_preference import UserPreference
from app.models.system_setting import SystemSetting
from app.schemas.setting import UserPreferenceUpdate, SystemSettingUpdate


def get_user_preference(db: Session, employee_id: int) -> UserPreference:
    pref = db.get(UserPreference, employee_id)
    if not pref:
        pref = UserPreference(employee_id=employee_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def update_user_preference(
    db: Session, employee_id: int, data: UserPreferenceUpdate
) -> UserPreference:
    pref = get_user_preference(db, employee_id)
    values = data.model_dump(exclude_unset=True)
    for key, val in values.items():
        if val is not None:
            setattr(pref, key, val)
    pref.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(pref)
    return pref


DEFAULT_SYSTEM_SETTINGS = {
    "system_name": "TaskSync Enterprise",
    "default_sprint_capacity": "30",
    "default_task_page_size": "20",
    "deadline_reminder_days": "3",
    "allow_employee_status_update": "true",
    "maintenance_mode": "false",
}


def get_system_settings_dict(db: Session) -> dict:
    settings = db.scalars(select(SystemSetting)).all()
    result = dict(DEFAULT_SYSTEM_SETTINGS)
    for s in settings:
        if s.value is not None:
            result[s.key] = s.value
    return {
        "system_name": result["system_name"],
        "default_sprint_capacity": int(result.get("default_sprint_capacity", 30)),
        "default_task_page_size": int(result.get("default_task_page_size", 20)),
        "deadline_reminder_days": int(result.get("deadline_reminder_days", 3)),
        "allow_employee_status_update": result.get("allow_employee_status_update", "true").lower() == "true",
        "maintenance_mode": result.get("maintenance_mode", "false").lower() == "true",
    }


def update_system_settings(
    db: Session, data: SystemSettingUpdate, updated_by_id: int
) -> dict:
    values = data.model_dump(exclude_unset=True)
    for key, val in values.items():
        if val is not None:
            str_val = str(val).lower() if isinstance(val, bool) else str(val)
            setting = db.get(SystemSetting, key)
            if not setting:
                setting = SystemSetting(key=key, value=str_val, updated_by=updated_by_id)
                db.add(setting)
            else:
                setting.value = str_val
                setting.updated_by = updated_by_id
                setting.updated_at = datetime.utcnow()
    db.commit()
    return get_system_settings_dict(db)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN
from app.schemas.setting import (
    UserPreferenceResponse,
    UserPreferenceUpdate,
    SystemSettingResponse,
    SystemSettingUpdate,
)
from app.crud import crud_setting

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/me", response_model=UserPreferenceResponse)
def get_my_preferences(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_setting.get_user_preference(db, current_user.id)


@router.patch("/me", response_model=UserPreferenceResponse)
def update_my_preferences(
    data: UserPreferenceUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return crud_setting.update_user_preference(db, current_user.id, data)


@router.get("/system", response_model=SystemSettingResponse)
def get_system_settings(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có Quản trị viên (Admin) mới có quyền truy cập Cấu hình Hệ thống.",
        )
    return crud_setting.get_system_settings_dict(db)


@router.patch("/system", response_model=SystemSettingResponse)
def update_system_settings(
    data: SystemSettingUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role_id != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ có Quản trị viên (Admin) mới có quyền cập nhật Cấu hình Hệ thống.",
        )
    return crud_setting.update_system_settings(db, data, current_user.id)

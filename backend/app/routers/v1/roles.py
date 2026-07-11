from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.core.deps import RequireAdmin
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse
)
from app.crud import role as crud_role
from app.cache import cache_manager
from app.cache.cache_keys import get_role_key, get_role_list_key

router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
    dependencies=[Depends(RequireAdmin)]
)

@router.get("", response_model=list[RoleResponse])
def get_roles(
        db: Session = Depends(get_db)
):
    key = get_role_list_key()
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: crud_role.get_all(db),
        ttl=settings.CACHE_TTL_DEFAULT,
        response_model=list[RoleResponse]
    )

@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
        role_id: int,
        db: Session = Depends(get_db)
):
    key = get_role_key(role_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_role.get_by_id(db, role_id),
        ttl=settings.CACHE_TTL_DEFAULT,
        response_model=RoleResponse
    )
    if not obj:
        raise HTTPException(404, "Role not found")
    return obj

@router.post("", response_model=RoleResponse)
def create_role(
        data: RoleCreate,
        db: Session = Depends(get_db)
):
    return crud_role.create(db, data)

@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
        role_id: int,
        data: RoleUpdate,
        db: Session = Depends(get_db)
):
    obj = crud_role.get_by_id(db, role_id)
    if not obj:
        raise HTTPException(404, "Role not found")
    return crud_role.update(db, obj, data)

@router.delete("/{role_id}")
def delete_role(
        role_id: int,
        db: Session = Depends(get_db)
):
    obj = crud_role.get_by_id(db, role_id)
    if not obj:
        raise HTTPException(404, "Role not found")
    crud_role.delete(db, obj)
    return {"message": "Deleted"}
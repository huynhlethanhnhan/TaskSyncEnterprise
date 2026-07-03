from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.deps import RequireAdmin

from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleResponse
)

from app.crud import role as crud_role

router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
    dependencies=[Depends(RequireAdmin)]
)


@router.get("", response_model=list[RoleResponse])
def get_roles(
        db: Session = Depends(get_db)
):
    return crud_role.get_all(db)


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
        role_id: int,
        db: Session = Depends(get_db)
):

    obj = crud_role.get_by_id(db, role_id)

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
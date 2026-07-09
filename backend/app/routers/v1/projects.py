from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.deps import RequireManager, RequireEmployee # <-- Admin, Manager và Employee

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse
)
from app.crud import project as crud_project

# Bổ sung kiểm soát quyền riêng lẻ ở từng route
router = APIRouter(
    prefix="/projects",
    tags=["Projects"]
)


@router.get(
    "",
    response_model=list[ProjectResponse],
    dependencies=[Depends(RequireEmployee)]
)
def get_projects(
        skip: int = 0,
        limit: int = settings.DEFAULT_PAGE_SIZE,
        db: Session = Depends(get_db)
):
    return crud_project.get_all(
        db,
        skip,
        limit
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireEmployee)]
)
def get_project(
        project_id: int,
        db: Session = Depends(get_db)
):
    obj = crud_project.get_by_id(
        db,
        project_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Project not found"
        )

    return obj


@router.post(
    "",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireManager)]
)
def create_project(
        data: ProjectCreate,
        db: Session = Depends(get_db)
):
    return crud_project.create(
        db,
        data
    )


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireManager)]
)
def update_project(
        project_id: int,
        data: ProjectUpdate,
        db: Session = Depends(get_db)
):
    obj = crud_project.get_by_id(
        db,
        project_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Project not found"
        )

    return crud_project.update(
        db,
        obj,
        data
    )


@router.delete(
    "/{project_id}",
    dependencies=[Depends(RequireManager)]
)
def delete_project(
        project_id: int,
        db: Session = Depends(get_db)
):
    obj = crud_project.get_by_id(
        db,
        project_id
    )

    if obj is None:
        raise HTTPException(
            404,
            "Project not found"
        )

    crud_project.delete(
        db,
        obj
    )

    return {
        "message": "Deleted"
    }
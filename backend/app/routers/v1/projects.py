from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.deps import (
    RequireManager,
    RequireEmployee,
)  # <-- Admin, Manager và Employee

from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectMemberSummaryResponse,
)
from app.models.employee import Employee
from app.core.deps import get_current_user

from app.crud import project as crud_project
from app.cache import cache_manager
from app.cache.cache_keys import get_project_key, get_project_list_key

# Bổ sung kiểm soát quyền riêng lẻ ở từng route
router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get(
    "", response_model=list[ProjectResponse], dependencies=[Depends(RequireEmployee)]
)
def get_projects(
    skip: int = 0,
    limit: int = settings.DEFAULT_PAGE_SIZE,
    db: Session = Depends(get_db),
):
    key = get_project_list_key(skip, limit)
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: list(crud_project.get_all(db, skip, limit)),
        ttl=settings.CACHE_TTL_PROJECT,
        response_model=list[ProjectResponse],
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_project(project_id: int, db: Session = Depends(get_db)):
    key = get_project_key(project_id)
    obj = cache_manager.cache_model(
        key=key,
        creator_fn=lambda: crud_project.get_by_id(db, project_id),
        ttl=settings.CACHE_TTL_PROJECT,
        response_model=ProjectResponse,
    )

    if obj is None:
        raise HTTPException(404, "Project not found")

    return obj


@router.post("", response_model=ProjectResponse, dependencies=[Depends(RequireManager)])
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    res = crud_project.create(db, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(res.id)
    return res


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireManager)],
)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db)):
    obj = crud_project.get_by_id(db, project_id)

    if obj is None:
        raise HTTPException(404, "Project not found")

    res = crud_project.update(db, obj, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(res.id)
    return res


@router.delete("/{project_id}", dependencies=[Depends(RequireManager)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    obj = crud_project.get_by_id(db, project_id)

    if obj is None:
        raise HTTPException(404, "Project not found")

    crud_project.delete(db, obj)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(project_id)

    return {"message": "Deleted"}


@router.get(
    "/{project_id:int}/members",
    response_model=list[ProjectMemberSummaryResponse],
    summary="List project members",
)
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    from app.models.project import Project
    from app.models.project_member import ProjectMember
    from app.models.employee import Employee
    from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
    from sqlalchemy import select

    project = db.get(Project, project_id)
    if not project or project.is_deleted:
        raise HTTPException(404, "Project not found")

    # RBAC IDOR check: Non-admins/managers must be members of the project to view its member list
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        member_stmt = select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == current_user.id,
        )
        is_member = db.scalars(member_stmt).first()
        if not is_member:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You must be a project member to view member details.",
            )

    members_stmt = (
        select(Employee)
        .join(ProjectMember, Employee.id == ProjectMember.employee_id)
        .where(ProjectMember.project_id == project_id, Employee.is_deleted == False)
    )
    members = db.scalars(members_stmt).all()

    # Fallback: If project has no explicit ProjectMember entries yet, return current_user if authorized
    if not members and current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        members = [current_user]

    return members


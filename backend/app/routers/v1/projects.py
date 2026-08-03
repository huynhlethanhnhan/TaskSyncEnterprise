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
    ProjectMemberAddRequest,
)
from app.models.employee import Employee
from app.core.deps import get_current_user

from app.crud import project as crud_project
from app.cache import cache_manager
from app.cache.cache_keys import get_project_key, get_project_list_key
from app.services.project_access import (
    require_project_access,
    require_project_management,
)

# Bổ sung kiểm soát quyền riêng lẻ ở từng route
router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get(
    "", response_model=list[ProjectResponse], dependencies=[Depends(RequireEmployee)]
)
def get_projects(
    skip: int = 0,
    limit: int = settings.DEFAULT_PAGE_SIZE,
    department_id: int | None = None,
    team_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    key = get_project_list_key(
        skip,
        limit,
        user_id=current_user.id,
        department_id=department_id,
        team_id=team_id,
        status=status,
    )
    return cache_manager.cache_collection(
        key=key,
        creator_fn=lambda: list(
            crud_project.get_all(
                db,
                current_user,
                skip,
                limit,
                department_id=department_id,
                team_id=team_id,
                status=status,
            )
        ),
        ttl=settings.CACHE_TTL_PROJECT,
        response_model=list[ProjectResponse],
    )


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireEmployee)],
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    require_project_access(db, project_id, current_user)
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
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    from app.services.project_access import validate_project_relationships

    validate_project_relationships(
        db, department_id=data.department_id, team_id=data.team_id
    )
    secured_data = data.model_copy(update={"created_by": current_user.id})
    res = crud_project.create(db, secured_data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(res.id)
    return res


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    dependencies=[Depends(RequireManager)],
)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    require_project_management(db, project_id, current_user)
    obj = crud_project.get_by_id(db, project_id)

    if obj is None:
        raise HTTPException(404, "Project not found")

    from app.services.project_access import validate_project_relationships

    target_department_id = (
        data.department_id if data.department_id is not None else obj.department_id
    )
    target_team_id = data.team_id if data.team_id is not None else obj.team_id
    validate_project_relationships(
        db, department_id=target_department_id, team_id=target_team_id
    )

    res = crud_project.update(db, obj, data)
    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(res.id)
    return res


@router.delete("/{project_id}", dependencies=[Depends(RequireManager)])
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    require_project_management(db, project_id, current_user)
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
    from sqlalchemy import select

    project = db.get(Project, project_id)
    if not project or project.is_deleted:
        raise HTTPException(404, "Project not found")

    require_project_access(db, project_id, current_user)

    members_stmt = (
        select(Employee)
        .join(ProjectMember, Employee.id == ProjectMember.employee_id)
        .where(
            ProjectMember.project_id == project_id,
            Employee.is_deleted == False,  # noqa: E712
            Employee.is_active == True,  # noqa: E712
        )
    )
    members = db.scalars(members_stmt).all()

    return members


@router.post(
    "/{project_id:int}/members",
    status_code=201,
    summary="Add a member to project",
)
def add_project_member(
    project_id: int,
    data: ProjectMemberAddRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    from app.models.project import Project
    from app.models.project_member import ProjectMember
    from app.models.employee import Employee
    from sqlalchemy import select
    from app.core.exceptions import BusinessRuleException

    project = db.get(Project, project_id)
    if not project or project.is_deleted:
        raise HTTPException(404, "Project not found")

    require_project_management(db, project_id, current_user)

    emp = db.get(Employee, data.employee_id)
    if not emp or emp.is_deleted or not emp.is_active:
        raise HTTPException(404, "Employee not found or is inactive.")

    from app.core.constants import ROLE_ADMIN

    if emp.role_id != ROLE_ADMIN:
        if (
            project.department_id is not None
            and emp.department_id != project.department_id
        ):
            raise BusinessRuleException(
                message="Nhân viên không thuộc Phòng ban phụ trách dự án.",
                error_code="EMPLOYEE_DEPARTMENT_MISMATCH",
                status_code=409,
            )
        if project.team_id is not None and emp.team_id != project.team_id:
            raise BusinessRuleException(
                message="Nhân viên không thuộc Team phụ trách dự án.",
                error_code="EMPLOYEE_TEAM_MISMATCH",
                status_code=409,
            )

    existing = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == data.employee_id,
        )
    )
    if existing is not None:
        raise BusinessRuleException(
            message="Thành viên đã thuộc dự án này.",
            error_code="MEMBER_ALREADY_IN_PROJECT",
            status_code=409,
        )

    member = ProjectMember(project_id=project_id, employee_id=data.employee_id)
    db.add(member)
    db.commit()
    db.refresh(member)

    from app.cache import CacheInvalidator

    CacheInvalidator.invalidate_project(project_id)

    return {
        "success": True,
        "message": "Đã thêm thành viên vào dự án thành công.",
        "project_id": project_id,
        "employee_id": data.employee_id,
    }

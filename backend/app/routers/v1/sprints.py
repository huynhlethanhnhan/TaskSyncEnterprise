# 📂 FILE: app/routers/v1/sprints.py
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.database import get_db
from app.models.employee import Employee
from app.models.sprint import Sprint
from app.models.sprint_snapshot import SprintDailySnapshot
from app.models.task import Task
from app.models.project_member import ProjectMember
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.sprint import (
    SprintCreate,
    SprintUpdate,
    SprintResponse,
    SprintAnalyticsResponse,
    SprintSnapshotResponse,
    VelocityResponse,
)
from app.cache import CacheInvalidator

router = APIRouter(prefix="/sprints", tags=["Sprints"])


def check_project_membership(db: Session, project_id: int, current_user: Employee):
    if current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER):
        return
    is_member = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == current_user.id
        )
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project's sprints")


def calculate_and_save_snapshot(db: Session, sprint_id: int, target_date: date) -> SprintDailySnapshot:
    # Get all active tasks in this sprint
    tasks = db.scalars(
        select(Task).where(
            Task.sprint_id == sprint_id,
            Task.is_deleted == False
        )
    ).all()

    total_sp = sum(t.story_points for t in tasks)
    completed_sp = sum(t.story_points for t in tasks if t.status == "Done")
    remaining_sp = total_sp - completed_sp

    total_tasks = len(tasks)
    completed_tasks_count = sum(1 for t in tasks if t.status == "Done")
    remaining_tasks_count = total_tasks - completed_tasks_count

    # Check if snapshot already exists
    snapshot = db.scalar(
        select(SprintDailySnapshot).where(
            SprintDailySnapshot.sprint_id == sprint_id,
            SprintDailySnapshot.snapshot_date == target_date
        )
    )

    if not snapshot:
        snapshot = SprintDailySnapshot(
            sprint_id=sprint_id,
            snapshot_date=target_date,
            remaining_story_points=remaining_sp,
            completed_story_points=completed_sp,
            remaining_tasks=remaining_tasks_count,
            completed_tasks=completed_tasks_count
        )
        db.add(snapshot)
    else:
        snapshot.remaining_story_points = remaining_sp
        snapshot.completed_story_points = completed_sp
        snapshot.remaining_tasks = remaining_tasks_count
        snapshot.completed_tasks = completed_tasks_count

    db.commit()
    db.refresh(snapshot)
    return snapshot


def backfill_snapshots(db: Session, sprint: Sprint):
    if not sprint.start_date:
        return

    start_date = sprint.start_date.date()
    # If completed, snap to end_date, otherwise snap to today
    end_date = sprint.end_date.date() if sprint.status == "Completed" and sprint.end_date else datetime.utcnow().date()
    
    current_date = start_date
    last_known_snapshot = None

    while current_date <= end_date:
        # Check if snapshot exists
        snapshot = db.scalar(
            select(SprintDailySnapshot).where(
                SprintDailySnapshot.sprint_id == sprint.id,
                SprintDailySnapshot.snapshot_date == current_date
            )
        )
        if not snapshot:
            if current_date == datetime.utcnow().date():
                # Compute today's snapshot fresh
                last_known_snapshot = calculate_and_save_snapshot(db, sprint.id, current_date)
            elif last_known_snapshot:
                # Carry forward the last known snapshot values
                snapshot = SprintDailySnapshot(
                    sprint_id=sprint.id,
                    snapshot_date=current_date,
                    remaining_story_points=last_known_snapshot.remaining_story_points,
                    completed_story_points=last_known_snapshot.completed_story_points,
                    remaining_tasks=last_known_snapshot.remaining_tasks,
                    completed_tasks=last_known_snapshot.completed_tasks
                )
                db.add(snapshot)
                db.commit()
                last_known_snapshot = snapshot
            else:
                # First day backfill, compute it fresh
                last_known_snapshot = calculate_and_save_snapshot(db, sprint.id, current_date)
        else:
            last_known_snapshot = snapshot
        
        current_date += timedelta(days=1)


@router.get("", response_model=list[SprintResponse])
def get_sprints(
    project_id: int | None = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if project_id is not None:
        check_project_membership(db, project_id, current_user)
        stmt = select(Sprint).where(
            Sprint.project_id == project_id,
            Sprint.is_deleted == False
        ).order_by(Sprint.id.desc())
    else:
        stmt = select(Sprint).where(
            Sprint.is_deleted == False
        ).order_by(Sprint.id.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=SprintResponse, status_code=201)
def create_sprint(
    data: SprintCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_membership(db, data.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can create sprints")

    sprint = Sprint(
        **data.model_dump(),
        created_by_id=current_user.id
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


@router.get("/{sprint_id:int}", response_model=SprintResponse)
def get_sprint(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    return sprint


@router.put("/{sprint_id:int}", response_model=SprintResponse)
def update_sprint(
    sprint_id: int,
    data: SprintUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can modify sprints")

    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(sprint, k, v)

    db.commit()
    db.refresh(sprint)
    return sprint


@router.patch("/{sprint_id:int}/start", response_model=SprintResponse)
def start_sprint(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can start sprints")

    # Prevent overlapping active sprints
    active_sprint = db.scalar(
        select(Sprint).where(
            Sprint.project_id == sprint.project_id,
            Sprint.status == "Active",
            Sprint.is_deleted == False
        )
    )
    if active_sprint and active_sprint.id != sprint_id:
        raise HTTPException(status_code=409, detail="There is already an active sprint for this project")

    sprint.status = "Active"
    if not sprint.start_date:
        sprint.start_date = datetime.utcnow()
    if not sprint.end_date:
        sprint.end_date = datetime.utcnow() + timedelta(days=14)

    db.commit()
    db.refresh(sprint)

    # Trigger first snapshot
    calculate_and_save_snapshot(db, sprint_id, datetime.utcnow().date())

    return sprint


@router.patch("/{sprint_id:int}/complete", response_model=SprintResponse)
def complete_sprint(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can complete sprints")

    sprint.status = "Completed"
    sprint.end_date = datetime.utcnow()
    db.commit()
    db.refresh(sprint)

    # Invalidate dashboard
    CacheInvalidator.invalidate_dashboard()

    return sprint


@router.patch("/{sprint_id:int}/cancel", response_model=SprintResponse)
def cancel_sprint(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can cancel sprints")

    sprint.status = "Cancelled"
    db.commit()
    db.refresh(sprint)
    return sprint


@router.patch("/{sprint_id:int}/reopen", response_model=SprintResponse)
def reopen_sprint(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(status_code=403, detail="Only Managers or Admins can reopen sprints")

    active_sprint = db.scalar(
        select(Sprint).where(
            Sprint.project_id == sprint.project_id,
            Sprint.status == "Active",
            Sprint.is_deleted == False
        )
    )
    if active_sprint and active_sprint.id != sprint_id:
        raise HTTPException(
            status_code=409,
            detail=f"Đã có Sprint '{active_sprint.name}' đang ở trạng thái Active. Vui lòng hoàn tất hoặc tạm dừng Sprint đó trước khi mở lại Sprint này."
        )

    sprint.status = "Active"
    db.commit()
    db.refresh(sprint)

    CacheInvalidator.invalidate_dashboard()
    return sprint


@router.get("/{sprint_id:int}/analytics", response_model=SprintAnalyticsResponse)
def get_sprint_analytics(
    sprint_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sprint = db.get(Sprint, sprint_id)
    if not sprint or sprint.is_deleted:
        raise HTTPException(status_code=404, detail="Sprint not found")

    check_project_membership(db, sprint.project_id, current_user)

    # Backfill snapshots for past days
    backfill_snapshots(db, sprint)

    # Get snapshots list
    snapshots = db.scalars(
        select(SprintDailySnapshot)
        .where(SprintDailySnapshot.sprint_id == sprint_id)
        .order_by(SprintDailySnapshot.snapshot_date.asc())
    ).all()

    # Get aggregate tasks info
    tasks = db.scalars(
        select(Task).where(
            Task.sprint_id == sprint_id,
            Task.is_deleted == False
        )
    ).all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "Done")
    total_sp = sum(t.story_points for t in tasks)
    completed_sp = sum(t.story_points for t in tasks if t.status == "Done")

    return SprintAnalyticsResponse(
        sprint_id=sprint.id,
        name=sprint.name,
        goal=sprint.goal,
        start_date=sprint.start_date,
        end_date=sprint.end_date,
        status=sprint.status,
        capacity=sprint.capacity,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_story_points=total_sp,
        completed_story_points=completed_sp,
        snapshots=[
            SprintSnapshotResponse(
                snapshot_date=s.snapshot_date,
                remaining_story_points=s.remaining_story_points,
                completed_story_points=s.completed_story_points,
                remaining_tasks=s.remaining_tasks,
                completed_tasks=s.completed_tasks,
            )
            for s in snapshots
        ],
    )


@router.get("/velocity", response_model=list[VelocityResponse])
def get_velocity(
    project_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_membership(db, project_id, current_user)

    # Get completed sprints of project
    sprints = db.scalars(
        select(Sprint).where(
            Sprint.project_id == project_id,
            Sprint.status == "Completed",
            Sprint.is_deleted == False
        ).order_by(Sprint.id.asc())
    ).all()

    results = []
    for s in sprints:
        # Sum completed tasks story points
        completed_sp = db.scalar(
            select(sa.func.sum(Task.story_points)).where(
                Task.sprint_id == s.id,
                Task.status == "Done",
                Task.is_deleted == False
            )
        ) or 0
        results.append(
            VelocityResponse(
                sprint_id=s.id,
                name=s.name,
                completed_story_points=completed_sp
            )
        )

    return results

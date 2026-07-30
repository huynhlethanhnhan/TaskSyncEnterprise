# 📂 FILE: app/routers/v1/feedback.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.cache import CacheInvalidator
from app.models.employee import Employee
from app.models.user_feedback import UserFeedback
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.feedback import (
    UserFeedbackCreate,
    UserFeedbackReview,
    UserFeedbackResponse,
    FeedbackAuthor,
)

router = APIRouter(prefix="/feedback", tags=["Feedback"])


def format_feedback(item: UserFeedback, current_user: Employee) -> UserFeedbackResponse:
    resp = UserFeedbackResponse.model_validate(item)

    # Anonymity protection: only ADMIN is authorized to see submitter of anonymous feedback
    if item.is_anonymous:
        if current_user.role_id != ROLE_ADMIN:
            resp.submitter = None
            resp.submitter_id = None

    return resp


@router.post("", response_model=UserFeedbackResponse, status_code=201)
def submit_feedback(
    data: UserFeedbackCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = UserFeedback(
        **data.model_dump(), submitter_id=current_user.id, created_by_id=current_user.id
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    CacheInvalidator.invalidate_feedback(feedback.id)
    return format_feedback(feedback, current_user)


@router.get("/my", response_model=list[UserFeedbackResponse])
def get_my_feedback(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(UserFeedback)
        .where(
            UserFeedback.submitter_id == current_user.id,
            UserFeedback.is_deleted == False,
        )
        .order_by(UserFeedback.id.desc())
    )
    items = db.scalars(stmt).all()
    return [format_feedback(i, current_user) for i in items]


@router.get("", response_model=list[UserFeedbackResponse])
def get_all_feedback(
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only Admin and Manager can see all feedback
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(
            status_code=403,
            detail="Only Managers or Admins can retrieve all feedback submissions",
        )

    stmt = (
        select(UserFeedback)
        .where(UserFeedback.is_deleted == False)
        .order_by(UserFeedback.id.desc())
    )
    items = db.scalars(stmt).all()
    return [format_feedback(i, current_user) for i in items]


@router.patch("/{feedback_id:int}/review", response_model=UserFeedbackResponse)
def review_feedback(
    feedback_id: int,
    data: UserFeedbackReview,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only Admin and Manager can review feedback
    if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
        raise HTTPException(
            status_code=403, detail="Only Managers or Admins can review feedback"
        )

    feedback = db.get(UserFeedback, feedback_id)
    if not feedback or feedback.is_deleted:
        raise HTTPException(status_code=404, detail="Feedback not found")

    feedback.status = data.status
    feedback.response = data.response
    feedback.reviewer_id = current_user.id
    db.commit()
    db.refresh(feedback)
    CacheInvalidator.invalidate_feedback(feedback.id)
    return format_feedback(feedback, current_user)

# 📂 FILE: app/routers/v1/topics.py
from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy import or_


from app.database import get_db
from app.cache import CacheInvalidator
from app.models.employee import Employee
from app.models.discussion_topic import DiscussionTopic
from app.models.discussion_reply import DiscussionReply
from app.models.project_member import ProjectMember
from app.core.deps import get_current_user
from app.core.constants import ROLE_ADMIN, ROLE_MANAGER
from app.schemas.topic import (
    DiscussionTopicCreate,
    DiscussionTopicUpdate,
    DiscussionTopicResponse,
    DiscussionReplyCreate,
    DiscussionReplyUpdate,
    DiscussionReplyResponse,
)

router = APIRouter(prefix="/topics", tags=["Discussion Topics"])


from app.models.project import Project


def check_project_membership(
    db: Session, project_id: int | None, current_user: Employee
):
    if not project_id:
        return
    project = db.scalar(
        select(Project).where(
            Project.id == project_id, Project.is_deleted == False
        )  # noqa: E712
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if current_user.role_id == ROLE_ADMIN:
        return

    if current_user.role_id == ROLE_MANAGER:
        is_dept_owner = (
            project.department_id is not None
            and project.department_id == current_user.department_id
        )
        is_creator = project.created_by == current_user.id
        is_member = db.scalar(
            select(ProjectMember.id).where(
                ProjectMember.project_id == project_id,
                ProjectMember.employee_id == current_user.id,
            )
        )
        if not (is_dept_owner or is_creator or is_member):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access discussions for this project",
            )
        return

    is_member = db.scalar(
        select(ProjectMember.id).where(
            ProjectMember.project_id == project_id,
            ProjectMember.employee_id == current_user.id,
        )
    )
    if not is_member and project.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project's discussions",
        )


@router.get("", response_model=list[DiscussionTopicResponse])
def get_topics(
    project_id: int | None = None,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_project_membership(db, project_id, current_user)

    stmt = select(DiscussionTopic).where(DiscussionTopic.is_deleted == False)
    if project_id:
        stmt = stmt.where(DiscussionTopic.project_id == project_id)
    else:
        if current_user.role_id not in (ROLE_ADMIN, ROLE_MANAGER):
            member_projects = db.scalars(
                select(ProjectMember.project_id).where(
                    ProjectMember.employee_id == current_user.id
                )
            ).all()
            stmt = stmt.where(
                or_(
                    DiscussionTopic.project_id.in_(member_projects),
                    DiscussionTopic.project_id.is_(None),
                )
            )

    stmt = stmt.order_by(DiscussionTopic.id.desc())
    topics = db.scalars(stmt).all()

    res = []
    for t in topics:
        reply_count = (
            db.scalar(
                select(func.count(DiscussionReply.id)).where(
                    DiscussionReply.topic_id == t.id,
                    DiscussionReply.is_deleted == False,
                )
            )
            or 0
        )

        replies_stmt = (
            select(DiscussionReply)
            .where(
                DiscussionReply.topic_id == t.id, DiscussionReply.is_deleted == False
            )
            .order_by(DiscussionReply.id.asc())
        )
        replies = db.scalars(replies_stmt).all()

        resp = DiscussionTopicResponse.model_validate(t)
        resp.reply_count = reply_count
        resp.replies = [DiscussionReplyResponse.model_validate(r) for r in replies]
        res.append(resp)

    return res


@router.post("", response_model=DiscussionTopicResponse, status_code=201)
def create_topic(
    data: DiscussionTopicCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target project is required for topic creation",
        )

    check_project_membership(db, data.project_id, current_user)

    topic = DiscussionTopic(**data.model_dump(), created_by_id=current_user.id)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    CacheInvalidator.invalidate_topic(topic.id)

    resp = DiscussionTopicResponse.model_validate(topic)
    resp.reply_count = 0
    resp.replies = []
    return resp


@router.get("/{topic_id:int}", response_model=DiscussionTopicResponse)
def get_topic(
    topic_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = db.get(DiscussionTopic, topic_id)
    if not topic or topic.is_deleted:
        raise HTTPException(status_code=404, detail="Topic not found")

    check_project_membership(db, topic.project_id, current_user)

    reply_count = (
        db.scalar(
            select(func.count(DiscussionReply.id)).where(
                DiscussionReply.topic_id == topic_id,
                DiscussionReply.is_deleted == False,
            )
        )
        or 0
    )

    replies_stmt = (
        select(DiscussionReply)
        .where(
            DiscussionReply.topic_id == topic_id, DiscussionReply.is_deleted == False
        )
        .order_by(DiscussionReply.id.asc())
    )
    replies = db.scalars(replies_stmt).all()

    resp = DiscussionTopicResponse.model_validate(topic)
    resp.reply_count = reply_count
    resp.replies = [DiscussionReplyResponse.model_validate(r) for r in replies]
    return resp


@router.put("/{topic_id:int}", response_model=DiscussionTopicResponse)
def update_topic(
    topic_id: int,
    data: DiscussionTopicUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = db.get(DiscussionTopic, topic_id)
    if not topic or topic.is_deleted:
        raise HTTPException(status_code=404, detail="Topic not found")

    if topic.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own topics")

    values = data.model_dump(exclude_unset=True)
    for k, v in values.items():
        setattr(topic, k, v)

    db.commit()
    db.refresh(topic)
    CacheInvalidator.invalidate_topic(topic.id)

    return get_topic(topic_id, current_user, db)


@router.delete("/{topic_id:int}")
def delete_topic(
    topic_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = db.get(DiscussionTopic, topic_id)
    if not topic or topic.is_deleted:
        raise HTTPException(status_code=404, detail="Topic not found")

    is_moderator = current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER)
    if topic.created_by_id != current_user.id and not is_moderator:
        raise HTTPException(
            status_code=403, detail="You are not authorized to delete this topic"
        )

    topic.is_deleted = True
    topic.deleted_at = datetime.now(UTC).replace(tzinfo=None)
    topic.deleted_by_id = current_user.id
    db.commit()
    CacheInvalidator.invalidate_topic(topic.id)

    return {"success": True, "message": "Topic deleted"}


@router.post(
    "/{topic_id:int}/replies", response_model=DiscussionReplyResponse, status_code=201
)
def create_reply(
    topic_id: int,
    data: DiscussionReplyCreate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    topic = db.get(DiscussionTopic, topic_id)
    if not topic or topic.is_deleted:
        raise HTTPException(status_code=404, detail="Topic not found")

    check_project_membership(db, topic.project_id, current_user)

    reply = DiscussionReply(
        topic_id=topic_id, content=data.content, created_by_id=current_user.id
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    CacheInvalidator.invalidate_topic(topic_id)
    return reply


@router.patch(
    "/{topic_id:int}/replies/{reply_id:int}", response_model=DiscussionReplyResponse
)
def update_reply(
    topic_id: int,
    reply_id: int,
    data: DiscussionReplyUpdate,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = db.get(DiscussionReply, reply_id)
    if not reply or reply.is_deleted or reply.topic_id != topic_id:
        raise HTTPException(status_code=404, detail="Reply not found")

    if reply.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own replies"
        )

    reply.content = data.content
    db.commit()
    db.refresh(reply)
    CacheInvalidator.invalidate_topic(topic_id)
    return reply


@router.delete("/{topic_id:int}/replies/{reply_id:int}")
def delete_reply(
    topic_id: int,
    reply_id: int,
    current_user: Employee = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reply = db.get(DiscussionReply, reply_id)
    if not reply or reply.is_deleted or reply.topic_id != topic_id:
        raise HTTPException(status_code=404, detail="Reply not found")

    is_moderator = current_user.role_id in (ROLE_ADMIN, ROLE_MANAGER)
    if reply.created_by_id != current_user.id and not is_moderator:
        raise HTTPException(
            status_code=403, detail="You are not authorized to delete this reply"
        )

    reply.is_deleted = True
    reply.deleted_at = datetime.now(UTC).replace(tzinfo=None)
    reply.deleted_by_id = current_user.id
    db.commit()
    CacheInvalidator.invalidate_topic(topic_id)

    return {"success": True, "message": "Reply deleted"}

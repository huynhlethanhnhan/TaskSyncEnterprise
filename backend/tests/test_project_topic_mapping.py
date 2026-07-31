"""
Contract tests for Project ↔ Topic/Epic mapping.
Cases:
- GET /api/v1/topics?project_id=<id> returns only topics for that project
- Topics for another project are excluded
- Admin sees all topics without project filter
- Projects return at least 1 topic after topics are seeded
"""
import uuid
import pytest
from app.models.role import Role
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.discussion_topic import DiscussionTopic
from app.core.security import get_password_hash


def _ensure_setup(db):
    admin_role = db.query(Role).filter(Role.role_name == "Admin").first()
    if not admin_role:
        admin_role = Role(role_name="Admin")
        db.add(admin_role)
        db.commit()

    dept = db.query(Department).filter(Department.department_code == "IT-TOP").first()
    if not dept:
        dept = Department(name="IT Topic Test", department_code="IT-TOP", is_active=True)
        db.add(dept)
        db.commit()

    admin = db.query(Employee).filter(Employee.email == "topic_adm@topictest.com").first()
    if not admin:
        admin = Employee(
            employee_code="EMP-TOPIC-CC",
            full_name="Topic Contract Admin",
            email="topic_adm@topictest.com",
            password_hash=get_password_hash("TaskSync@2026"),
            role_id=admin_role.id,
            department_id=dept.id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    uid = uuid.uuid4().hex[:6]

    proj_a = Project(
        project_code=f"PA-{uid}",
        name=f"Project A {uid}",
        description="",
        status="Active",
        created_by=admin.id,
    )
    proj_b = Project(
        project_code=f"PB-{uid}",
        name=f"Project B {uid}",
        description="",
        status="Active",
        created_by=admin.id,
    )
    db.add_all([proj_a, proj_b])
    db.commit()

    topic_a = DiscussionTopic(
        project_id=proj_a.id,
        title=f"Epic for A-{uid}",
        content="Content A",
        created_by_id=admin.id,
        is_deleted=False,
    )
    topic_b = DiscussionTopic(
        project_id=proj_b.id,
        title=f"Epic for B-{uid}",
        content="Content B",
        created_by_id=admin.id,
        is_deleted=False,
    )
    db.add_all([topic_a, topic_b])
    db.commit()

    return admin, proj_a, proj_b, topic_a, topic_b, uid


def _admin_token(client):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": "topic_adm@topictest.com", "password": "TaskSync@2026"},
    )
    assert r.status_code == 200, f"Login failed: {r.json()}"
    return r.json()["access_token"]


# ── Tests ─────────────────────────────────────────────────────────────────────


def test_topics_filter_by_project_returns_correct_topics(client, db):
    """GET /topics?project_id=A only returns topics belonging to Project A."""
    admin, proj_a, proj_b, topic_a, topic_b, uid = _ensure_setup(db)
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get(f"/api/v1/topics?project_id={proj_a.id}", headers=headers)
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert f"Epic for A-{uid}" in titles
    assert f"Epic for B-{uid}" not in titles


def test_topics_filter_by_other_project_excludes_unrelated(client, db):
    """GET /topics?project_id=B must not include Project A's topics."""
    admin, proj_a, proj_b, topic_a, topic_b, uid = _ensure_setup(db)
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get(f"/api/v1/topics?project_id={proj_b.id}", headers=headers)
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert f"Epic for B-{uid}" in titles
    assert f"Epic for A-{uid}" not in titles


def test_topics_without_project_filter_returns_accessible_only(client, db):
    """Admin without project_id filter sees all active (non-deleted) topics."""
    admin, proj_a, proj_b, topic_a, topic_b, uid = _ensure_setup(db)
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/topics", headers=headers)
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert f"Epic for A-{uid}" in titles
    assert f"Epic for B-{uid}" in titles


def test_projects_have_topics_not_empty(client, db):
    """After creating topics, each project should return at least 1 topic."""
    admin, proj_a, proj_b, topic_a, topic_b, uid = _ensure_setup(db)
    token = _admin_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    for pid in (proj_a.id, proj_b.id):
        resp = client.get(f"/api/v1/topics?project_id={pid}", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1, f"Project {pid} has no topics"

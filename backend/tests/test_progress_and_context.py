from datetime import datetime, UTC
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.backlog_item import BacklogItem
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.crud import task as crud_task
from app.crud import department as crud_department
from app.services.progress_service import recalculate_project_progress


def test_project_progress_lifecycle(db: Session):
    # 1. Khởi tạo Dự án mới
    project = Project(
        project_code="PRJ-TEST-01",
        name="Dự án Kiểm thử Tiến độ Thực tế",
        status="Planning",
        priority="Medium",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 2. Tạo 4 công việc riêng lẻ (standalone tasks)
    task1 = crud_task.create(
        db,
        TaskCreate(
            project_id=project.id,
            title="Task 1",
            status="To Do",
            priority="Medium",
        ),
    )
    task2 = crud_task.create(
        db,
        TaskCreate(
            project_id=project.id,
            title="Task 2",
            status="To Do",
            priority="Medium",
        ),
    )
    task3 = crud_task.create(
        db,
        TaskCreate(
            project_id=project.id,
            title="Task 3",
            status="To Do",
            priority="Medium",
        ),
    )
    task4 = crud_task.create(
        db,
        TaskCreate(
            project_id=project.id,
            title="Task 4",
            status="To Do",
            priority="Medium",
        ),
    )

    db.refresh(project)
    assert project.progress_percent == 0.0

    # 3. Chuyển 2 công việc sang "Done" -> Tiến độ phải đạt 50%
    crud_task.update(db, task1, TaskUpdate(status="Done"))
    crud_task.update(db, task2, TaskUpdate(status="Done"))

    db.refresh(project)
    assert project.progress_percent == 50.0
    assert project.status != "Completed"

    # 4. Chuyển 2 công việc còn lại sang "Done" -> Tiến độ phải đạt 100% và trạng thái là "Completed"
    crud_task.update(db, task3, TaskUpdate(status="Done"))
    crud_task.update(db, task4, TaskUpdate(status="Done"))

    db.refresh(project)
    assert project.progress_percent == 100.0
    assert project.status == "Completed"

    # 5. Mở lại task4 sang "In Progress" -> Tiến độ giảm về 75%, trạng thái phải tự động hoàn trả về "Active"
    crud_task.update(db, task4, TaskUpdate(status="In Progress"))

    db.refresh(project)
    assert project.progress_percent == 75.0
    assert project.status == "Active"

    # 6. Xóa task4 (soft delete) -> Tiến độ tính lại trên 3 task còn lại: 3 Done / 3 Total = 100%
    crud_task.delete(db, task4)

    db.refresh(project)
    assert project.progress_percent == 100.0
    assert project.status == "Completed"


def test_task_context_metadata(db: Session):
    project = Project(
        project_code="PRJ-TEST-02",
        name="Dự án Phân định Context Task",
        status="Active",
        priority="High",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    sprint = Sprint(
        project_id=project.id,
        name="Sprint Alpha",
        status="Active",
        capacity=30,
        is_deleted=False,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)

    # 1. Task trong Sprint
    task_in_sprint = Task(
        project_id=project.id,
        sprint_id=sprint.id,
        title="Công việc thuộc Sprint",
        status="To Do",
        priority="High",
        is_deleted=False,
    )
    db.add(task_in_sprint)

    # 2. Task riêng lẻ (Standalone)
    task_standalone = Task(
        project_id=project.id,
        sprint_id=None,
        title="Công việc riêng lẻ không thuộc Sprint",
        status="To Do",
        priority="Low",
        is_deleted=False,
    )
    db.add(task_standalone)
    db.commit()

    db.refresh(task_in_sprint)
    db.refresh(task_standalone)

    # Kiểm tra metadata và schema serialization
    res_sprint = TaskResponse.model_validate(task_in_sprint)
    assert res_sprint.sprint_name == "Sprint Alpha"
    assert res_sprint.is_standalone is False

    res_standalone = TaskResponse.model_validate(task_standalone)
    assert res_standalone.sprint_name is None
    assert res_standalone.is_standalone is True

    # 3. Task bắt nguồn từ Backlog
    backlog_item = BacklogItem(
        project_id=project.id,
        task_id=task_in_sprint.id,
        title="User Story Backlog",
        status="Converted",
        priority="High",
        is_deleted=False,
    )
    db.add(backlog_item)
    db.commit()
    db.refresh(task_in_sprint)

    res_backlog = TaskResponse.model_validate(task_in_sprint)
    assert res_backlog.is_from_backlog is True


def test_department_metrics_sync(db: Session):
    dept = Department(
        department_code="DEPT-ENG",
        name="Kỹ thuật & Công nghệ",
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    emp = Employee(
        employee_code="EMP001",
        full_name="Nguyễn Văn A",
        email="a.nguyen@test.com",
        password_hash="fakehash",
        department_id=dept.id,
        role_id=3,
        is_active=True,
        is_deleted=False,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    proj = Project(
        project_code="PRJ-ENG-01",
        name="Hệ thống nội bộ",
        department_id=dept.id,
        status="Active",
        progress_percent=0.0,
        is_deleted=False,
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # Add member to project
    member = ProjectMember(project_id=proj.id, employee_id=emp.id)
    db.add(member)
    db.commit()

    # Tạo task cho project
    task = Task(
        project_id=proj.id,
        title="Nhiệm vụ 1",
        status="In Progress",
        is_deleted=False,
    )
    db.add(task)
    db.commit()
    recalculate_project_progress(db, proj.id)

    metrics = crud_department._get_work_metrics(db, [dept.id])
    # dept.id -> (project_count, completed_project_count, sprint_count)
    assert metrics[dept.id][0] == 1
    assert metrics[dept.id][1] == 0  # Chưa xong vì còn In Progress

    # Đánh dấu task Done -> Project hoàn thành 100% -> completed_project_count tăng lên 1
    task.status = "Done"
    db.commit()
    recalculate_project_progress(db, proj.id)

    metrics_after = crud_department._get_work_metrics(db, [dept.id])
    assert metrics_after[dept.id][1] == 1

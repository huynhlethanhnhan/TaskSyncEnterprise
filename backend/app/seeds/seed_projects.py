import random
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.employee import Employee
from app.core.constants import ROLE_MANAGER, ROLE_ADMIN

PROJECTS_DATA = [
    {
        "project_code": "PRJ-SPRINT-TEST",
        "name": "Project Sprint Test Harness",
        "description": "Dự án chuyên dụng kiểm thử quy trình và kích hoạt Sprints (Sprint Activation)",
        "status": "Active",
        "priority": "High",
    },
    {
        "project_code": "PRJ-ENTERPRISE-CORE",
        "name": "Enterprise Core System Revamp",
        "description": "Nâng cấp lõi kiến trúc backend FastAPI và cơ sở dữ liệu MS SQL Server",
        "status": "Active",
        "priority": "Critical",
    },
    {
        "project_code": "PRJ-MOBILE-APP",
        "name": "TaskSync Mobile Client",
        "description": "Phát triển ứng dụng di động React Native cho iOS và Android",
        "status": "Active",
        "priority": "High",
    },
    {
        "project_code": "PRJ-AI-ASSISTANT",
        "name": "AI Copilot Integration",
        "description": "Tích hợp trợ lý trí tuệ nhân tạo gợi ý phân công công việc",
        "status": "Planned",
        "priority": "Medium",
    },
    {
        "project_code": "PRJ-SECURITY-AUDIT",
        "name": "Cybersecurity & Compliance 2026",
        "description": "Đánh giá an toàn thông tin và tuân thủ tiêu chuẩn ISO 27001",
        "status": "Planned",
        "priority": "High",
    },
    {
        "project_code": "PRJ-LEGACY-MIGRATION",
        "name": "Legacy Data Migration Phase 1",
        "description": "Chuyển đổi dữ liệu hệ thống cũ sang kiến trúc mới",
        "status": "Completed",
        "priority": "Medium",
    },
    {
        "project_code": "PRJ-BI-ANALYTICS",
        "name": "Business Intelligence Reporting",
        "description": "Xây dựng dashboard báo cáo hiệu năng và năng suất lao động",
        "status": "Completed",
        "priority": "Low",
    },
    {
        "project_code": "PRJ-IOT-MONITOR",
        "name": "IoT Infrastructure Monitoring",
        "description": "Giám sát tự động hạ tầng máy chủ và thiết bị văn phòng",
        "status": "On Hold",
        "priority": "Low",
    },
]


def seed_projects(db: Session, employees: list[Employee]) -> list[Project]:
    random.seed(2026)
    managers = [e for e in employees if e.role_id in (ROLE_MANAGER, ROLE_ADMIN)]
    if not managers:
        managers = employees

    created_projects = []
    for idx, pdata in enumerate(PROJECTS_DATA):
        project = db.query(Project).filter_by(project_code=pdata["project_code"]).first()
        creator = managers[idx % len(managers)]
        if not project:
            project = Project(
                project_code=pdata["project_code"],
                name=pdata["name"],
                description=pdata["description"],
                status=pdata["status"],
                priority=pdata["priority"],
                created_by=creator.id,
                is_deleted=False,
            )
            db.add(project)
            db.commit()
            db.refresh(project)
        created_projects.append(project)

        # Ensure project members (4 to 10 members)
        member_sample = random.sample(employees, k=min(len(employees), random.randint(5, 9)))
        # Always ensure employee001 is member of PRJ-SPRINT-TEST and PRJ-ENTERPRISE-CORE
        emp001 = next((e for e in employees if e.employee_code == "employee001"), None)
        if emp001 and emp001 not in member_sample:
            member_sample.append(emp001)

        for emp in member_sample:
            existing_pm = db.query(ProjectMember).filter_by(project_id=project.id, employee_id=emp.id).first()
            if not existing_pm:
                pm = ProjectMember(project_id=project.id, employee_id=emp.id)
                db.add(pm)
        db.commit()

    return created_projects

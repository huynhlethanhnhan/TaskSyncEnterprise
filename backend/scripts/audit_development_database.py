# 📂 FILE: backend/scripts/audit_development_database.py
"""
Read-only Database Audit Script for TaskSyncEnterprise Work Management Module.
Prints a summary report without modifying any data.
"""
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func
from app.database import SessionLocal
from app.models.role import Role
from app.models.department import Department
from app.models.employee import Employee
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.sprint import Sprint
from app.models.discussion_topic import DiscussionTopic
from app.models.task import Task
from app.models.task_assignment import TaskAssignment
from app.models.backlog_item import BacklogItem
from app.models.notification import Notification
from app.models.user_session import UserSession
from app.models.refresh_token import RefreshToken
from app.models.token_blacklist import TokenBlacklist

def run_audit():
    print("=" * 60)
    print("      DEVELOPMENT DATABASE READ-ONLY AUDIT REPORT")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # 1. Entity Counts
        roles_cnt = db.scalar(select(func.count(Role.id))) or 0
        depts_cnt = db.scalar(select(func.count(Department.id))) or 0
        emps_cnt = db.scalar(select(func.count(Employee.id))) or 0
        active_emps_cnt = db.scalar(select(func.count(Employee.id)).where(Employee.is_active == True, Employee.is_deleted == False)) or 0
        projects_cnt = db.scalar(select(func.count(Project.id))) or 0
        active_projects_cnt = db.scalar(select(func.count(Project.id)).where(Project.is_deleted == False)) or 0
        pm_cnt = db.scalar(select(func.count(ProjectMember.id))) or 0
        sprints_cnt = db.scalar(select(func.count(Sprint.id))) or 0
        topics_cnt = db.scalar(select(func.count(DiscussionTopic.id))) or 0
        tasks_cnt = db.scalar(select(func.count(Task.id))) or 0
        active_tasks_cnt = db.scalar(select(func.count(Task.id)).where(Task.is_deleted == False)) or 0
        assignments_cnt = db.scalar(select(func.count(TaskAssignment.id))) or 0
        backlog_cnt = db.scalar(select(func.count(BacklogItem.id))) or 0
        notifs_cnt = db.scalar(select(func.count(Notification.id))) or 0
        sessions_cnt = db.scalar(select(func.count(UserSession.id))) or 0
        active_sessions_cnt = db.scalar(select(func.count(UserSession.id)).where(UserSession.is_active == True)) or 0
        refresh_tokens_cnt = db.scalar(select(func.count(RefreshToken.id))) or 0
        blacklisted_tokens_cnt = db.scalar(select(func.count(TokenBlacklist.id))) or 0

        print("\n--- ENTITY COUNTS ---")
        print(f"Roles: {roles_cnt}")
        print(f"Departments: {depts_cnt}")
        print(f"Employees: {emps_cnt} (Active: {active_emps_cnt})")
        print(f"Projects: {projects_cnt} (Active: {active_projects_cnt})")
        print(f"ProjectMembers: {pm_cnt}")
        print(f"Sprints: {sprints_cnt}")
        print(f"Discussion Topics: {topics_cnt}")
        print(f"Tasks: {tasks_cnt} (Active: {active_tasks_cnt})")
        print(f"TaskAssignments: {assignments_cnt}")
        print(f"BacklogItems: {backlog_cnt}")
        print(f"Notifications: {notifs_cnt}")
        print(f"User Sessions: {sessions_cnt} (Active: {active_sessions_cnt})")
        print(f"Refresh Tokens: {refresh_tokens_cnt}")
        print(f"Blacklisted Tokens: {blacklisted_tokens_cnt}")

        # 2. Specific Project Audit (Project 72)
        print("\n--- PROJECT 72 AUDIT ---")
        p72 = db.get(Project, 72)
        if p72:
            print(f"Project 72 found: Name='{p72.name}', Code='{getattr(p72, 'project_code', 'N/A')}', Status='{p72.status}', is_deleted={p72.is_deleted}")
            p72_members = db.scalars(select(ProjectMember).where(ProjectMember.project_id == 72)).all()
            print(f"Project 72 Member count: {len(p72_members)}")
            p72_tasks = db.scalars(select(Task).where(Task.project_id == 72)).all()
            print(f"Project 72 Task count: {len(p72_tasks)}")
        else:
            print("Project 72: NOT FOUND in database!")

        # 3. Integrity & Orphan Checks
        print("\n--- INTEGRITY & ORPHAN CHECKS ---")
        # Orphan ProjectMember -> invalid project
        orphan_pm_project = db.scalars(
            select(ProjectMember).outerjoin(Project, ProjectMember.project_id == Project.id).where(Project.id == None)
        ).all()
        print(f"Orphan ProjectMembers (missing Project): {len(orphan_pm_project)}")

        # Orphan ProjectMember -> invalid employee
        orphan_pm_employee = db.scalars(
            select(ProjectMember).outerjoin(Employee, ProjectMember.employee_id == Employee.id).where(Employee.id == None)
        ).all()
        print(f"Orphan ProjectMembers (missing Employee): {len(orphan_pm_employee)}")

        # Orphan TaskAssignment -> invalid task
        orphan_ta_task = db.scalars(
            select(TaskAssignment).outerjoin(Task, TaskAssignment.task_id == Task.id).where(Task.id == None)
        ).all()
        print(f"Orphan TaskAssignments (missing Task): {len(orphan_ta_task)}")

        # Orphan TaskAssignment -> invalid employee
        orphan_ta_emp = db.scalars(
            select(TaskAssignment).outerjoin(Employee, TaskAssignment.employee_id == Employee.id).where(Employee.id == None)
        ).all()
        print(f"Orphan TaskAssignments (missing Employee): {len(orphan_ta_emp)}")

        # Orphan Task -> invalid project
        orphan_task_project = db.scalars(
            select(Task).outerjoin(Project, Task.project_id == Project.id).where(Project.id == None)
        ).all()
        print(f"Orphan Tasks (missing Project): {len(orphan_task_project)}")

        # 4. Recent Tasks Sample
        print("\n--- RECENT TASKS SAMPLE (LAST 5) ---")
        recent_tasks = db.scalars(select(Task).order_by(Task.id.desc()).limit(5)).all()
        for t in recent_tasks:
            assignee_str = f"AssignedTo={t.assigned_to}" if t.assigned_to else "Unassigned"
            print(f"ID={t.id} | Title='{t.title}' | ProjectID={t.project_id} | Status='{t.status}' | {assignee_str} | CreatedAt={t.created_at}")

        print("\n=" * 60)
        print("                 AUDIT COMPLETE")
        print("=" * 60)
    finally:
        db.close()

if __name__ == "__main__":
    run_audit()

# 📂 FILE: backend/seed_v2.py
import sys
import os

# Add current folder to sys.path to resolve app imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.department import Department
from app.models.employee import Employee
from app.models.role import Role
from app.models.project import Project
from app.core.security import get_password_hash

def seed():
    db = SessionLocal()
    try:
        print("[INFO] Seeding database...")
        
        # 1. Create department
        dept_it = db.query(Department).filter(Department.department_code == "IT").first()
        if not dept_it:
            dept_it = Department(
                department_code="IT",
                name="Information Technology",
                description="Information Technology Department"
            )
            db.add(dept_it)
            db.flush()
            print("- Created IT department")
        else:
            print("- IT department already exists")

        # 2. Create Roles in order: Admin (1), Manager (2), Employee (3)
        roles_data = [
            {"role_name": "admin", "description": "Administrator Role"},
            {"role_name": "manager", "description": "Manager Role"},
            {"role_name": "employee", "description": "Employee Role"}
        ]
        
        for r_data in roles_data:
            role = db.query(Role).filter(Role.role_name == r_data["role_name"]).first()
            if not role:
                role = Role(
                    role_name=r_data["role_name"],
                    description=r_data["description"],
                    is_system=True
                )
                db.add(role)
                db.flush()
                print(f"- Created role: {r_data['role_name']} (ID: {role.id})")
            else:
                print(f"- Role {r_data['role_name']} already exists (ID: {role.id})")
                
        # Query role IDs from the DB
        admin_role = db.query(Role).filter(Role.role_name == "admin").first()
        employee_role = db.query(Role).filter(Role.role_name == "employee").first()
        
        admin_role_id = admin_role.id if admin_role else 1
        employee_role_id = employee_role.id if employee_role else 3
        
        # 3. Create Admin account
        admin_user = db.query(Employee).filter(Employee.email == "admin@gmail.com").first()
        if not admin_user:
            admin_user = Employee(
                employee_code="EMP001",
                full_name="Admin V2",
                email="admin@gmail.com",
                password_hash=get_password_hash("123456"),
                role_id=admin_role_id,
                is_active=True,
                is_first_login=False
            )
            db.add(admin_user)
            db.flush()
            print("- Created Admin user")
        else:
            print("- Admin user already exists")

        # 4. Create Employee "demo 1" account
        demo_user = db.query(Employee).filter(Employee.email == "demo1@gmail.com").first()
        if not demo_user:
            demo_user = Employee(
                employee_code="EMP002",
                full_name="demo 1",
                email="demo1@gmail.com",
                password_hash=get_password_hash("123456"),
                role_id=employee_role_id,
                department_id=dept_it.id,
                is_active=True,
                is_first_login=False
            )
            db.add(demo_user)
            db.flush()
            print("- Created employee 'demo 1'")
        else:
            print("- Employee 'demo 1' already exists")

        # 5. Create Project
        project = db.query(Project).filter(Project.project_code == "PRJ_IT_001").first()
        if not project:
            project = Project(
                project_code="PRJ_IT_001",
                name="IT Project V2",
                description="Seeded V2 IT Project",
                status="Planning",
                priority="Medium",
                progress_percent=0.0
            )
            db.add(project)
            db.flush()
            print("- Created project 'IT Project V2'")
        else:
            print("- Project 'IT Project V2' already exists")
            
        db.commit()
        print("SUCCESS: Seed Data created successfully! You can log in using admin@gmail.com or demo1@gmail.com (Password: 123456)")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()

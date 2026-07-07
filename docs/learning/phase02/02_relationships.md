# 02: Database Relationships & ER Mapping
## Backend Learning Course - TaskSync Enterprise V2

This guide teaches how to design, enforce, and optimize table relationships (One-to-Many, Many-to-Many, Self-referential) using SQL Server constraints and SQLAlchemy.

---

## 1. Core Concepts of Database Relationships

In an Enterprise Task Management system, entities do not live in isolation. We map their relationships to represent business logic:

### One-to-Many (1:N)
* **Definition**: A parent row in Table A can match multiple child rows in Table B, but each child row in Table B links to exactly one parent row in Table A.
* **Why it exists**: To normalize data, preventing duplicate records.
* **Use Case**: One Department has many Employees, but each Employee belongs to exactly one Department.

### Many-to-Many (N:M)
* **Definition**: Multiple rows in Table A match multiple rows in Table B.
* **Why it exists**: To model complex business assignments.
* **Use Case**: A Project has many Employees (Members), and an Employee can work on multiple Projects.
* **Implementation**: Enforced using an intermediary **Association Table** (e.g. `project_members`) holding foreign keys for both target tables.

### Self-Referential (Unary)
* **Definition**: A table containing a foreign key pointing back to its own primary key.
* **Why it exists**: To model hierarchical networks.
* **Use Case**: The reporting structure of an organization. Each Employee can have a `manager_id` referencing another Employee.

---

## 2. Dynamic ASCII ER Diagram
```text
  +--------------------+             +-------------------+
  |     departments    |             |       roles       |
  +--------------------+             +-------------------+
  | id (PK)            |             | id (PK)           |
  +---------+----------+             +---------+---------+
            | 1                                | 1
            |                                  |
            | N                                | N
  +---------v----------------------------------v---------+
  |                      employees                       |
  +------------------------------------------------------+
  | id (PK) <------------------------------------+       |
  | department_id (FK)                           |       |
  | role_id (FK)                                 |       |
  | manager_id (FK) -----------------------------+       |
  +---------+--------------------------------------------+
            | 1
            |
            | N (Created By)
  +---------v----------+             +-------------------+
  |      projects      |             |       tasks       |
  +--------------------+             +-------------------+
  | id (PK) <----------+-------------+ project_id (FK)   |
  | created_by (FK)    | 1         N |                   |
  +---------+----------+             +---------+---------+
            | 1                                | 1
            |                                  |
            | N (Through project_members)      | N (Through assignments)
  +---------v----------+             +---------v---------+
  |   project_members  |             |  task_assignments |
  +--------------------+             +-------------------+
  | project_id (FK)    |             | task_id (FK)      |
  | employee_id (FK)   |             | employee_id (FK)  |
  +--------------------+             +-------------------+
```

---

## 3. SQL Implementations

```sql
-- 1. One-to-Many Relationship (Employees -> Department)
ALTER TABLE dbo.employees 
ADD CONSTRAINT FK_employees_departments 
FOREIGN KEY (department_id) REFERENCES dbo.departments (id);

-- 2. Self-Referential Relationship (Employee -> Manager)
ALTER TABLE dbo.employees 
ADD CONSTRAINT FK_employees_manager 
FOREIGN KEY (manager_id) REFERENCES dbo.employees (id);

-- 3. Many-to-Many Intermediary Table (Project Members)
CREATE TABLE dbo.project_members (
    project_id INT NOT NULL,
    employee_id INT NOT NULL,
    joined_at DATETIME2 DEFAULT SYSUTCDATETIME() NOT NULL,
    CONSTRAINT PK_project_members PRIMARY KEY (project_id, employee_id),
    CONSTRAINT FK_members_projects FOREIGN KEY (project_id) REFERENCES dbo.projects (id),
    CONSTRAINT FK_members_employees FOREIGN KEY (employee_id) REFERENCES dbo.employees (id)
);
```

---

## 4. SQLAlchemy 2.0 ORM Mappings

```python
from typing import List, Optional
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str]
    
    # One-to-Many relationship mapping
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("dbo.departments.id"))
    department: Mapped[Optional["Department"]] = relationship("Department", back_populates="employees")
    
    # Self-Referential relationship mapping
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("dbo.employees.id"))
    manager: Mapped[Optional["Employee"]] = relationship("Employee", remote_side=[id], back_populates="subordinates")
    subordinates: Mapped[List["Employee"]] = relationship("Employee", back_populates="manager")
```

---

## 5. Optimization: Loading Strategies
Selecting how SQLAlchemy loads related entities affects database performance:

1. **Lazy Loading (`lazy="select"`)**:
   * *How it works*: Fetches child records only when you access the attribute in Python.
   * *Risk*: Causes the **N+1 query problem**. Fetching 100 employees triggers 1 query for employees, then 100 separate queries for each employee's department.
2. **Joined Loading (`lazy="joined"`)**:
   * *How it works*: Performs an SQL `LEFT OUTER JOIN` in the initial query to load parent and child rows in one call.
   * *Use Case*: Ideal for One-to-One and Many-to-One relationships.
3. **Selectin Loading (`lazy="selectin"`)**:
   * *How it works*: Emits a second query using the `IN` operator (e.g. `SELECT ... WHERE parent_id IN (1, 2, 3...)`).
   * *Use Case*: The industry standard for loading One-to-Many and Many-to-Many collections.

---

## 6. Comparison: Enforcing Constraints

### Database-Enforced FK vs. App-Level Checking
* **Option A: Application check (Python script validation)**
  * *Pros*: Simple setup, database-agnostic.
  * *Cons*: Concurrent race conditions can corrupt tables. If a user deletes a role while a new employee is registers with it, the database accepts invalid data.
* **Option B: Database Enforcement (Physical Constraints)**
  * *Pros*: Guaranteed database consistency. SQL Server intercepts and rejects conflicting queries.
  * *Cons*: Direct deletion raises database exceptions that must be handled gracefully in API layers.
  * *Why Option B is better*: Enterprise architectures rely on database constraints to guarantee data integrity across multiple client integrations.

---

## 7. Senior Notes
> "Never rely on lazy loading in production loops."
Beginner developers often cause performance bottlenecks by letting ORMs lazy-load data implicitly. In enterprise applications, always use `selectinload` or `joinedload` explicitly during queries inside APIs to load exactly what is needed in a single, predictable SQL query.

---

## 8. Exercises & Sandbox

### Review Questions
1. How does SQLAlchemy represent self-referential hierarchies using the `remote_side` parameter?
2. What causes the N+1 query problem, and how does Joined Loading solve it?

### SQL Exercise
Write a SQL Server query to fetch a list of employees, showing:
* Employee's full name.
* Department name.
* Direct manager's full name.
Use left joins to support employees who do not belong to a department or have a manager.

### Coding Exercise
Modify a FastAPI route query to load an Employee record along with their Manager and Department details in a single query using `joinedload`.
```python
# Complete the missing query parameters:
# db.execute(select(Employee).where(Employee.id == employee_id)...).scalar_one_or_none()
```

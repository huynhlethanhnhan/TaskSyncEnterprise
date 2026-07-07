# 01: Database Design & Default Constraints
## Backend Learning Course - TaskSync Enterprise V2

This guide teaches the foundations of relational database design, focusing on primary keys, default constraints, and timezone-independent logging (UTC timestamps) under MS SQL Server.

---

## 1. Core Relational Databases Foundations

### Primary Keys (PK)
* **Definition**: A column (or set of columns) that uniquely identifies each row in a table. It cannot contain `NULL` values, and all values must be unique.
* **Why it exists**: To maintain entity integrity, enabling direct updates, deletions, and precise query lookups.
* **Enterprise Use Case**: An employee database relies on an `id` or `employee_code` primary key to distinguish individuals with matching names (e.g., two employees named "Nguyen Van A").

### Default Constraints
* **Definition**: A database rule that automatically assigns a specified default value to a column when an insert operation does not provide one.
* **Why it exists**: To guarantee fallback value consistency and remove default logic burden from application code.
* **Enterprise Use Case**: Every new task created in a task board defaults to the status `N'To Do'` and a priority of `N'Medium'`.

---

## 2. UTC Timestamps vs. Local Server Time

### The Timezone Problem
In local environments, databases often use local system functions like `GETDATE()` or `NOW()` to record timestamps. However, if your cloud server is in Dublin, your database server is in Singapore, and your employees are in Ho Chi Minh City, logging timestamps in local server time causes chaotic timelines.

### The Solution: `SYSUTCDATETIME()`
MS SQL Server provides two main functions for logging timestamps:
1. `GETDATE()`: Returns the current database system timestamp (local time).
2. `SYSUTCDATETIME()`: Returns the current UTC system timestamp with higher precision (fractional seconds up to 7 digits), matching SQL Server standards.

By standardizing on `SYSUTCDATETIME()`, every timestamp in your database represents absolute UTC time. Developers can then format dates to the user's local offset on the frontend.

---

## 3. Code Implementations

### Raw SQL (SQL Server)
```sql
-- Creating a table with explicit PK and Default Constraints
CREATE TABLE dbo.projects (
    id INT IDENTITY(1,1) NOT NULL,
    project_code NVARCHAR(50) NOT NULL,
    name NVARCHAR(200) NOT NULL,
    status NVARCHAR(30) CONSTRAINT DF_projects_status DEFAULT N'Planning' NOT NULL,
    created_at DATETIME2 CONSTRAINT DF_projects_created_at DEFAULT SYSUTCDATETIME() NOT NULL,
    CONSTRAINT PK_projects PRIMARY KEY (id)
);
```

### SQLAlchemy 2.0 ORM
```python
from datetime import datetime
from sqlalchemy import String, DateTime, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(200))
    
    # Standardizing Defaults using server_default
    status: Mapped[str] = mapped_column(String(30), server_default=text("N'Planning'"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("SYSUTCDATETIME()"))
```

### FastAPI Integration (CRUD API)
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db

router = APIRouter()

class ProjectCreate(BaseModel):
    project_code: str
    name: str

@router.post("/projects")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    # Notice: status and created_at are omitted. The database will populate them automatically!
    new_project = Project(
        project_code=payload.project_code,
        name=payload.name
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project
```

---

## 4. Alternative Options Comparison

### Setting Defaults: Python-side vs. Database-side
* **Option A: Python-side default (`default=datetime.utcnow`)**
  * *Pros*: Simple, runs independent of the target database dialect.
  * *Cons*: If an administrator runs an insert script directly inside SQL Server, or if another service accesses the database, the column will remain `NULL` (or fail if marked `NOT NULL`).
* **Option B: Database-side default (`server_default=text("SYSUTCDATETIME()")`)**
  * *Pros*: Completely unified. Enforced at the engine level regardless of the database client.
  * *Cons*: Requires migrations when changing database types (e.g. SQLite does not support `SYSUTCDATETIME()`).
  * *Why Option B is better*: Enterprise databases are rarely accessed by only one application. Emitting constraints at the engine level guarantees absolute data safety.

---

## 5. Senior Notes
Experienced engineers design systems to be timezone-agnostic:
> "Store UTC globally, display local offsets locally." 
Always use high-precision date types like `DATETIME2` or `DATETIMEOFFSET` in SQL Server, and configure `server_default` constraints on every tracking column (`created_at`, `updated_at`, `timestamp`).

---

## 6. Common Mistakes & Best Practices
* **Mistake**: Inserting text defaults on SQL Server without the Unicode prefix `N`. For example, `DEFAULT 'Đang xử lý'` will lose Vietnamese accents during conversions if the database collation is not configured correctly.
  * *Best Practice*: Always write default strings with the Unicode prefix, like `DEFAULT N'Đang xử lý'`.
* **Mistake**: Mixing `default=func.now()` and `server_default`. Keep them clean; choose `server_default` to minimize Python runtime processing overhead.

---

## 7. Exercises & Sandbox

### Review Questions
1. Why is `SYSUTCDATETIME()` preferred over `GETDATE()` in modern MS SQL Server databases?
2. What is the functional difference between `default` and `server_default` in SQLAlchemy?

### SQL Exercise
Write a SQL Server script to create a table `dbo.audit_logs` containing:
* An identity primary key `id`.
* A column `action` defaulting to `N'View'`.
* A high-precision timestamp `timestamp` defaulting to UTC.

### Debugging Exercise
A junior developer reports that their test suite crashes on SQLite when trying to run unit tests because SQLite does not support `SYSUTCDATETIME()`. How do you adapt SQLAlchemy's metadata during test setup to resolve this without altering model files? *(Hint: Look at how `tests/conftest.py` intercepts table column defaults).*

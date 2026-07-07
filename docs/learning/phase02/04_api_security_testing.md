# 04: API Route Protection, Hashing, & Unit Testing
## Backend Learning Course - TaskSync Enterprise V2

This guide teaches how to secure FastAPI routes, implement direct cryptographic hashing, write db-agnostic unit tests, and pre-initialize static file storage.

---

## 1. Concepts Overview

### Route Protection (RBAC)
* **Definition**: Enforcing access rules on endpoints based on the current user's role (e.g., Admin, Manager, Employee).
* **Why it exists**: To restrict unauthorized access to administrative features.
* **Enterprise Use Case**: Only Admins and Managers can retrieve the complete list of employees or view audit logs.

### Cryptographic Hashing (Direct Bcrypt)
* **Definition**: Hashing cleartext passwords using the salt-hashed `bcrypt` algorithm.
* **Why it exists**: To secure user credentials. Even if database access is compromised, hashed passwords cannot be reversed.
* **Enterprise Use Case**: Users log in securely using access and refresh tokens.

### Database-Agnostic Testing
* **Definition**: Running automated unit tests on an in-memory SQLite database while using SQL Server in production.
* **Why it exists**: Keeps unit tests fast and independent of active network services.

---

## 2. Resolving the Bcrypt 72-byte Limit

### The Problem
Legacy Python frameworks like `passlib` wrap around the `bcrypt` library. In modern versions of the python `bcrypt` package, passlib throws a `ValueError: password cannot be longer than 72 bytes` during standard checks due to string padding incompatibilities.

### The Solution: Direct Bcrypt Usage
Instead of routing password verification through passlib's `CryptContext`, we use the python `bcrypt` package directly to hash and compare bytes:
```python
import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Encode inputs to bytes first
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
```

---

## 3. Database-Agnostic Test Adapter (`tests/conftest.py`)

Since testing uses SQLite in-memory, we must dynamically rewrite our SQL Server metadata at test startup to avoid syntax errors:
1. **Strip Schema Prefixes**: SQLite does not support schema qualifiers like `dbo.`.
2. **Translate Defaults**: Translate SQL Server-specific default functions (like `SYSUTCDATETIME()`) and Unicode prefixes (like `N'Planning'`) into SQLite-compatible defaults.

### Implementation inside `tests/conftest.py`:
```python
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql.schema import DefaultClause
from app.database import Base

engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(scope="function")
def db():
    # Dynamic Metadata Adapter for SQLite compatibility
    for table in Base.metadata.tables.values():
        table.schema = None  # Remove 'dbo' prefix
        for column in table.columns:
            if column.server_default is not None and isinstance(column.server_default, DefaultClause):
                arg = column.server_default.arg
                default_val = arg.text if hasattr(arg, "text") else str(arg)
                
                # Rewrite MS SQL Server functions to SQLite equivalents
                if "GETDATE()" in default_val or "SYSUTCDATETIME()" in default_val:
                    column.server_default.arg = text("CURRENT_TIMESTAMP")
                elif default_val.startswith("N'") and default_val.endswith("'"):
                    column.server_default.arg = text(default_val[1:])  # Strip N' prefix

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
```

---

## 4. Pre-initializing Upload Directories

Enterprise systems handle attachments (such as task uploads and user avatars) using physical file storage. To prevent file write exceptions, the application startup sequence must verify and pre-create target subdirectories:

### Implementation inside `app/main.py`:
```python
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Pre-create directory paths on startup
uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
(uploads_dir / "avatars").mkdir(parents=True, exist_ok=True)
(uploads_dir / "attachments").mkdir(parents=True, exist_ok=True)

# Mount files access endpoint
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
```

---

## 5. Senior Notes
> "Keep your tests independent of external databases."
Never run automated unit tests against a shared SQL Server instance. If multiple tests edit the same database concurrently, tests will fail unpredictably. Always use in-memory databases like SQLite or mock db interfaces for tests to guarantee speed and reliability.

---

## 6. Exercises & Sandbox

### Review Questions
1. Why does the passlib bcrypt context fail with modern python-bcrypt packages?
2. What transformations does the SQLite test adapter apply to schema prefixes and default values?

### Debugging Exercise
A developer writes a unit test that fails with:
`sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such table: dbo.employees`
Identify the issue and explain how to resolve it based on the guides above.
*(Hint: Think about table.schema mapping).*

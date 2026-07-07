import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Use SQLite for simple unit testing demonstration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    from sqlalchemy import text
    from sqlalchemy.sql.schema import DefaultClause
    # Intercept and adapt metadata dynamically for SQLite
    for table in Base.metadata.tables.values():
        table.schema = None
        for column in table.columns:
            if column.server_default is not None and isinstance(column.server_default, DefaultClause):
                arg = column.server_default.arg
                default_val = arg.text if hasattr(arg, "text") else str(arg)
                if "GETDATE()" in default_val or "SYSUTCDATETIME()" in default_val:
                    column.server_default.arg = text("CURRENT_TIMESTAMP")
                elif default_val.startswith("N'") and default_val.endswith("'"):
                    column.server_default.arg = text(default_val[1:])
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

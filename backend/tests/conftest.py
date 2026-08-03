import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db

# The application metadata defaults to SQL Server's ``dbo`` schema. Normalize
# it before importing ``app.models`` and ``app.main`` so mapper aliases created
# during application startup never capture a schema-qualified selectable in the SQLite harness.
Base.metadata.schema = None
import app.models as _app_models  # noqa: F401
for table in Base.metadata.tables.values():
    table.schema = None

from app.main import app

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
    import app.models  # noqa: F401

    # Intercept and adapt metadata dynamically for SQLite. Clearing only each
    # table schema leaves ORM aliases able to inherit MetaData(schema="dbo"),
    # which makes joined dashboard queries target a nonexistent dbo database.
    Base.metadata.schema = None
    for key in list(Base.metadata.tables.keys()):
        table = Base.metadata.tables[key]
        table.schema = None
        for column in table.columns:
            if column.server_default is not None and isinstance(
                column.server_default, DefaultClause
            ):
                arg = column.server_default.arg
                default_val = arg.text if hasattr(arg, "text") else str(arg)
                if "GETDATE()" in default_val or "SYSUTCDATETIME()" in default_val:
                    column.server_default.arg = text("CURRENT_TIMESTAMP")
                elif default_val.startswith("N'") and default_val.endswith("'"):
                    column.server_default.arg = text(default_val[1:])
    # Schema is deliberately mutated for the SQLite test harness. SQLAlchemy's
    # engine-level compilation cache can otherwise reuse SQL compiled before
    # normalization (for example, ``dbo.employees`` from an earlier test).
    engine.clear_compiled_cache()
    Base.metadata.create_all(bind=engine, checkfirst=True)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine, checkfirst=True)


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


@pytest.fixture(autouse=True)
def mock_smtp_client():
    from unittest.mock import patch

    with patch(
        "app.services.email.smtp_client.SMTPClient.send",
        return_value="SMTP delivery successful",
    ) as mock:
        yield mock


@pytest.fixture(autouse=True)
def mock_redis_client(request):
    # Skip global mocking for cache and cache manager unit test suites
    if "test_cache" in request.module.__name__:
        yield None
        return

    from unittest.mock import patch, MagicMock, PropertyMock

    mock_client = MagicMock()
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.setex.return_value = True
    mock_client.ping.return_value = True

    with patch(
        "app.cache.redis_client.RedisClient.client", new_callable=PropertyMock
    ) as mock_prop:
        mock_prop.return_value = mock_client
        yield mock_client


@pytest.fixture(scope="session", autouse=True)
def _shutdown_tracing_on_pytest_exit():
    yield
    from app.tracing.config import shutdown_tracing

    shutdown_tracing()

from collections.abc import Generator

from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=settings.SQL_ECHO,
    pool_pre_ping=True,
    pool_recycle=1800,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
    future=True,
)


class Base(DeclarativeBase):
    metadata = MetaData(schema="dbo")


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
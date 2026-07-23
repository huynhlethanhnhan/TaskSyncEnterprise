import unittest
from datetime import datetime, timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import DateTime, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from app.schemas.pagination import SortParams
from app.utils.query_engine import QueryEngine


class Base(DeclarativeBase):
    pass


class Event(Base):
    __tablename__ = "query_engine_sort_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class QueryEngineDefaultSortTest(unittest.TestCase):
    def test_default_sort_order_is_used_when_client_omits_sort_by(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        now = datetime(2026, 7, 22, 8, 0)

        with Session(engine) as session:
            session.add_all([Event(created_at=now - timedelta(minutes=10)), Event(created_at=now)])
            session.commit()
            query = QueryEngine.apply_sorting(
                session.query(Event),
                Event,
                SortParams(),
                allowed_fields=["id", "created_at"],
                default_sort_by="created_at",
                default_sort_order="desc",
            )

            self.assertEqual([event.created_at for event in query.all()], [now, now - timedelta(minutes=10)])


if __name__ == "__main__":
    unittest.main()

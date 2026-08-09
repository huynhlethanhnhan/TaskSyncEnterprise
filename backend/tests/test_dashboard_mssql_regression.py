from types import SimpleNamespace

from app.services.dashboard_service import DashboardService


class EmptyResult:
    def all(self):
        return []


class MssqlEmptySession:
    bind = SimpleNamespace(dialect=SimpleNamespace(name="mssql"))

    def execute(self, _statement):
        return EmptyResult()


def test_detailed_analytics_uses_module_datetime_on_mssql(monkeypatch):
    """Regression: the SQL Server branch must not shadow ``datetime``."""
    service = DashboardService()
    monkeypatch.setattr(service, "get_overview", lambda _db, _user=None: {})

    result = service._get_detailed_analytics_db(MssqlEmptySession())

    assert result["overview"] == {}
    assert result["upcoming_deadlines"] == []
    assert result["monthly_activity"] == []

"""AnalyticsService tests — mock DB session."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.analytics_service import AnalyticsService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def analytics_svc(mock_db):
    return AnalyticsService(mock_db)


class TestOverview:
    async def test_overview(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        p1 = MagicMock()
        p1.__getitem__ = lambda self, i: {0: "in_development", 1: 3}[i]
        p2 = MagicMock()
        p2.__getitem__ = lambda self, i: {0: "on_sale", 1: 5}[i]

        j1 = MagicMock()
        j1.__getitem__ = lambda self, i: {0: "approved", 1: 2}[i]
        j2 = MagicMock()
        j2.__getitem__ = lambda self, i: {0: "in_progress", 1: 4}[i]

        mock_db.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[p1, p2])),
            MagicMock(all=MagicMock(return_value=[j1, j2])),
        ]

        result = await analytics_svc.get_overview()

        assert result["products_by_status"] == {"in_development": 3, "on_sale": 5}
        assert result["projects_by_status"] == {"approved": 2, "in_progress": 4}


class TestTrends:
    async def test_trends(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        r1 = MagicMock()
        r1.__getitem__ = lambda self, i: {0: "2026-06-01", 1: 2}[i]
        r2 = MagicMock()
        r2.__getitem__ = lambda self, i: {0: "2026-06-02", 1: 1}[i]
        mock_db.execute.return_value.all.return_value = [r1, r2]

        result = await analytics_svc.get_trends()

        assert result == [
            {"date": "2026-06-01", "count": 2},
            {"date": "2026-06-02", "count": 1},
        ]


class TestTaskStats:
    async def test_task_stats(self, analytics_svc, mock_db):
        mock_db.scalar = AsyncMock()
        mock_db.scalar.side_effect = [10, 7, 1]

        result = await analytics_svc.get_task_stats()

        assert result == {"total": 10, "completed": 7, "blocked": 1, "pending": 2}

    async def test_task_stats_empty(self, analytics_svc, mock_db):
        mock_db.scalar = AsyncMock()
        mock_db.scalar.side_effect = [0, 0, 0]

        result = await analytics_svc.get_task_stats()

        assert result == {"total": 0, "completed": 0, "blocked": 0, "pending": 0}


class TestIssueDistribution:
    async def test_issue_distribution(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        r1 = MagicMock()
        r1.__getitem__ = lambda self, i: {0: "critical", 1: 2}[i]
        r2 = MagicMock()
        r2.__getitem__ = lambda self, i: {0: "major", 1: 5}[i]
        mock_db.execute.return_value.all.return_value = [r1, r2]

        result = await analytics_svc.get_issue_distribution()

        assert result == [
            {"severity": "critical", "count": 2},
            {"severity": "major", "count": 5},
        ]

    async def test_issue_distribution_null_severity(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        r = MagicMock()
        r.__getitem__ = lambda self, i: {0: None, 1: 3}[i]
        mock_db.execute.return_value.all.return_value = [r]

        result = await analytics_svc.get_issue_distribution()

        assert result == [{"severity": "unknown", "count": 3}]

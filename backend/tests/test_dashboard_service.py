"""DashboardService tests — mock DB session."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.dashboard_service import DashboardService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def dashboard_svc(mock_db):
    return DashboardService(mock_db)


class TestGetStats:
    async def test_get_stats_with_data(self, dashboard_svc, mock_db):
        # scalar returns: products, projects, pending_tasks, completed_tasks
        mock_db.scalar = AsyncMock(side_effect=[12, 5, 8, 20])
        mock_db.execute = AsyncMock()
        # recent projects
        rp1 = MagicMock()
        rp1.__getitem__ = lambda self, i: {0: "p1", 1: "Project A", 2: "in_progress", 3: "2026-06-01"}[i]
        rp2 = MagicMock()
        rp2.__getitem__ = lambda self, i: {0: "p2", 1: "Project B", 2: "approved", 3: "2026-06-02"}[i]
        # recent tasks
        rt1 = MagicMock()
        rt1.__getitem__ = lambda self, i: {0: "t1", 1: "Task A", 2: "in_progress", 3: "2026-06-03"}[i]

        mock_db.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[rp1, rp2])),
            MagicMock(all=MagicMock(return_value=[rt1])),
        ]

        result = await dashboard_svc.get_stats()

        assert result["active_products"] == 12
        assert result["active_projects"] == 5
        assert result["pending_tasks"] == 8
        assert result["completed_tasks"] == 20
        assert len(result["recent_projects"]) == 2
        assert len(result["recent_tasks"]) == 1
        assert result["recent_projects"][0]["name"] == "Project A"
        assert result["recent_tasks"][0]["name"] == "Task A"

    async def test_get_stats_empty_db(self, dashboard_svc, mock_db):
        mock_db.scalar = AsyncMock(side_effect=[None, None, None, None])
        mock_db.execute = AsyncMock()
        mock_db.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[])),
            MagicMock(all=MagicMock(return_value=[])),
        ]

        result = await dashboard_svc.get_stats()

        assert result["active_products"] == 0
        assert result["active_projects"] == 0
        assert result["pending_tasks"] == 0
        assert result["completed_tasks"] == 0
        assert result["recent_projects"] == []
        assert result["recent_tasks"] == []

    async def test_recent_projects_format(self, dashboard_svc, mock_db):
        mock_db.scalar = AsyncMock(side_effect=[0, 0, 0, 0])
        mock_db.execute = AsyncMock()
        rp = MagicMock()
        rp.__getitem__ = lambda self, i: {0: "p1", 1: "Proj", 2: "approved", 3: None}[i]
        mock_db.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[rp])),
            MagicMock(all=MagicMock(return_value=[])),
        ]

        result = await dashboard_svc.get_stats()

        assert result["recent_projects"][0]["created_at"] is None

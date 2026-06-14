"""CertificationService + AnalyticsService + DashboardService tests."""
from datetime import date, timedelta
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import NotFoundError
from app.services.certification_service import CertificationService
from app.services.analytics_service import AnalyticsService
from app.services.dashboard_service import DashboardService
from tests.conftest import make_mock_certification


@pytest.fixture
def cert_svc(mock_db):
    return CertificationService(mock_db)


@pytest.fixture
def analytics_svc(mock_db):
    return AnalyticsService(mock_db)


@pytest.fixture
def dashboard_svc(mock_db):
    return DashboardService(mock_db)


class TestCertificationService:
    async def test_create(self, cert_svc, mock_db):
        cert_svc.repo.create = AsyncMock()
        result = await cert_svc.create_certification(
            {"product_id": "p-001", "cert_type": "CE", "cert_number": "CE-999"}, "u-001"
        )
        assert result.cert_type == "CE"
        mock_db.commit.assert_awaited_once()

    async def test_get_all(self, cert_svc):
        cert_svc.repo.get_all = AsyncMock(return_value=([make_mock_certification()], 1))
        results, total = await cert_svc.get_certifications()
        assert total == 1

    async def test_get_with_filters(self, cert_svc):
        cert_svc.repo.get_all = AsyncMock(return_value=([], 0))
        await cert_svc.get_certifications(product_id="p-001", cert_type="CE", status="valid")
        cert_svc.repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, product_id="p-001", cert_type="CE", status="valid"
        )

    async def test_update_not_found(self, cert_svc):
        cert_svc.repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await cert_svc.update_certification("bad", {"status": "expired"})

    async def test_check_expiry_bulk_update(self, cert_svc, mock_db):
        """Verify that check_expiry issues BULK UPDATE (not N+1)."""
        # Execute should return a result with rowcount
        mock_result = AsyncMock()
        mock_result.rowcount = 3
        mock_db.execute = AsyncMock(return_value=mock_result)
        count = await cert_svc.check_expiry_and_update_status()
        assert count == 6  # 3 expired + 3 expiring_soon
        assert mock_db.execute.await_count == 2  # Two bulk updates

    async def test_get_expiring(self, cert_svc):
        cert_svc.repo.get_expiring = AsyncMock(return_value=([], 0))
        await cert_svc.get_expiring(days=60)
        cert_svc.repo.get_expiring.assert_awaited_once_with(days=60)


class TestAnalyticsService:
    async def test_get_overview_empty(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.all = lambda: []
        result = await analytics_svc.get_overview()
        assert result["products_by_status"] == {}
        assert result["projects_by_status"] == {}

    async def test_get_task_stats(self, analytics_svc, mock_db):
        mock_db.scalar = AsyncMock(side_effect=[100, 50, 10])
        stats = await analytics_svc.get_task_stats()
        assert stats["total"] == 100
        assert stats["completed"] == 50
        assert stats["blocked"] == 10
        assert stats["pending"] == 40

    async def test_get_issue_distribution(self, analytics_svc, mock_db):
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.all = lambda: [("critical", 3), ("minor", 7)]
        result = await analytics_svc.get_issue_distribution()
        assert len(result) == 2


class TestDashboardService:
    async def test_get_stats(self, dashboard_svc, mock_db):
        mock_db.scalar = AsyncMock(side_effect=[10, 5, 20, 15])
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.all = lambda: []
        stats = await dashboard_svc.get_stats()
        assert stats["active_products"] == 10
        assert stats["active_projects"] == 5
        assert stats["pending_tasks"] == 20
        assert stats["completed_tasks"] == 15

    async def test_recent_projects_empty(self, dashboard_svc, mock_db):
        mock_db.scalar = AsyncMock(side_effect=[0, 0, 0, 0])
        mock_db.execute = AsyncMock()
        mock_db.execute.return_value.all = lambda: []
        stats = await dashboard_svc.get_stats()
        assert stats["recent_projects"] == []
        assert stats["recent_tasks"] == []

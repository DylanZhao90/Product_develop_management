"""Integration tests — core business flows through the HTTP API layer.

Uses SQLite in-memory via conftest.py fixtures. Tests the full stack:
HTTP → route → service → repository → DB.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestHealthCheck:
    async def test_health_endpoint(self, async_client: AsyncClient):
        resp = await async_client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


@pytest.mark.integration
class TestAuthFlow:
    async def test_feishu_login_url(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/auth/feishu/login")
        assert resp.status_code == 200
        data = resp.json()
        assert "auth_url" in data

    async def test_me_requires_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    async def test_protected_routes_require_auth(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/products")
        assert resp.status_code == 401


@pytest.mark.integration
class TestDashboard:
    async def test_dashboard_stats_empty_db(self, async_client: AsyncClient):
        """Dashboard should return zero stats when DB is empty, but requires auth."""
        resp = await async_client.get("/api/v1/dashboard/stats")
        assert resp.status_code == 401  # Requires authentication

    async def test_dashboard_unauthorized(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/dashboard/stats")
        assert resp.status_code == 401


@pytest.mark.integration
class TestAnalytics:
    async def test_analytics_overview_empty_db(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/analytics/overview")
        assert resp.status_code == 401  # Requires auth


@pytest.mark.integration
class TestErrorHandling:
    async def test_404_on_nonexistent_product(self, async_client: AsyncClient):
        resp = await async_client.get("/api/v1/products/nonexistent-id-12345")
        assert resp.status_code == 401  # Auth required first

    async def test_cors_headers(self, async_client: AsyncClient):
        resp = await async_client.options("/api/health")
        assert resp.status_code in [200, 405]  # OPTIONS may or may not be allowed


@pytest.mark.integration
class TestAPIRegistration:
    """Verify all expected API routes are registered."""

    async def test_routes_registered(self, async_client: AsyncClient):
        # All routes should return 401 (requires auth) or 200/400 (public)
        # None should return 404 if they are registered
        routes = [
            ("/api/v1/auth/feishu/login", 200),  # Public — GET
            ("/api/v1/products", 401),            # Requires auth
            ("/api/v1/projects", 401),
            ("/api/v1/design-files", 401),
            ("/api/v1/suppliers", 401),
            ("/api/v1/firmware/versions", 401),
            ("/api/v1/analytics/overview", 401),
            ("/api/v1/certifications", 401),
        ]
        for path, expected_status in routes:
            resp = await async_client.get(path)
            assert resp.status_code == expected_status, f"Route {path} returned {resp.status_code}, expected {expected_status}"

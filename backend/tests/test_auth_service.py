"""AuthService + Security tests."""
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ForbiddenError, NotFoundError
from app.services.auth_service import AuthService
from tests.conftest import make_mock_user


@pytest.fixture
def auth_svc(mock_db):
    return AuthService(mock_db)


class TestFeishuSSOLogin:
    async def test_new_user_registers(self, auth_svc, mock_db):
        """New Feishu user auto-registers with engineer role."""
        user_info = {"open_id": "ou_new", "union_id": "un_new", "name": "Bob", "email": "bob@feishu.com"}
        auth_svc.user_repo.get_by_feishu_open_id = AsyncMock(return_value=None)
        auth_svc.user_repo.create = AsyncMock()
        # Mock JWT creation
        import app.services.auth_service as m
        m.create_access_token = lambda **kw: "access-token"
        m.create_refresh_token = lambda **kw: "refresh-token"

        result = await auth_svc.feishu_sso_login(user_info)

        assert result["access_token"] == "access-token"
        assert result["user"]["name"] == "Bob"
        assert result["user"]["role"] == "engineer"
        mock_db.commit.assert_awaited_once()

    async def test_existing_user_logs_in(self, auth_svc, mock_db):
        """Existing active user logs in successfully."""
        existing = make_mock_user(feishu_open_id="ou_123", is_active=True)
        auth_svc.user_repo.get_by_feishu_open_id = AsyncMock(return_value=existing)
        import app.services.auth_service as m
        m.create_access_token = lambda **kw: "access-token"
        m.create_refresh_token = lambda **kw: "refresh-token"

        result = await auth_svc.feishu_sso_login({"open_id": "ou_123", "name": "Alice"})

        assert result["user"]["name"] == "Alice"
        auth_svc.user_repo.create.assert_not_called()

    async def test_deactivated_user_rejected(self, auth_svc):
        """Deactivated user gets ForbiddenError."""
        existing = make_mock_user(feishu_open_id="ou_456", is_active=False)
        auth_svc.user_repo.get_by_feishu_open_id = AsyncMock(return_value=existing)
        with pytest.raises(ForbiddenError, match="deactivated"):
            await auth_svc.feishu_sso_login({"open_id": "ou_456"})


class TestGetCurrentUser:
    async def test_found(self, auth_svc):
        user = make_mock_user()
        auth_svc.user_repo.get_by_id = AsyncMock(return_value=user)
        info = await auth_svc.get_current_user_info("u-001")
        assert info["name"] == "Alice"
        assert info["role"] == "engineer"

    async def test_not_found(self, auth_svc):
        auth_svc.user_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError, match="User not found"):
            await auth_svc.get_current_user_info("bad")

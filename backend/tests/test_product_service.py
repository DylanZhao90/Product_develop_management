"""ProductService tests — full coverage: CRUD, lifecycle transitions, error cases."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import BadRequestError, NotFoundError
from app.core.event_bus import Topics
from app.services.product_service import ProductService
from tests.conftest import make_mock_lifecycle_log, make_mock_product


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def product_svc(mock_db):
    return ProductService(mock_db)


@pytest.fixture
def mock_product():
    return make_mock_product()


@pytest.fixture
def mock_lifecycle_log():
    return make_mock_lifecycle_log()


# ---------------------------------------------------------------------------
# create_product
# ---------------------------------------------------------------------------


class TestCreateProduct:
    async def test_create_success(self, product_svc, mock_db):
        """Create product with valid data."""
        data = {
            "name": "AC Charger Pro",
            "model": "AC-2000",
            "type": "ac_charger",
            "target_markets": ["EU", "US"],
            "certification_requirements": ["CE", "FCC"],
            "description": "Next-gen charger",
        }
        created_by = "u-001"

        product_svc.product_repo.generate_code = AsyncMock(return_value="AC-2026-0002")
        product_svc.product_repo.create = AsyncMock()

        result = await product_svc.create_product(data, created_by)

        product_svc.product_repo.generate_code.assert_awaited_once_with("ac_charger")
        product_svc.product_repo.create.assert_awaited_once()
        assert result.name == data["name"]
        assert result.model == data["model"]
        assert result.lifecycle_status == "in_development"
        mock_db.commit.assert_awaited_once()

    async def test_create_without_type(self, product_svc):
        """Create product without type uses default prefix 'PD'."""
        data = {"name": "Generic", "model": "GN-001"}
        product_svc.product_repo.generate_code = AsyncMock(return_value="PD-2026-0001")
        product_svc.product_repo.create = AsyncMock()

        result = await product_svc.create_product(data, "u-001")

        product_svc.product_repo.generate_code.assert_awaited_once_with(None)
        assert result.code == "PD-2026-0001"


# ---------------------------------------------------------------------------
# get_products / get_product
# ---------------------------------------------------------------------------


class TestGetProducts:
    async def test_get_all(self, product_svc, mock_product):
        """List products with default pagination."""
        product_svc.product_repo.get_all = AsyncMock(return_value=([mock_product], 1))
        results, total = await product_svc.get_products()
        assert len(results) == 1
        assert total == 1
        product_svc.product_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, status=None, product_type=None, search=None,
        )

    async def test_get_with_filters(self, product_svc):
        """List products with filters applied."""
        product_svc.product_repo.get_all = AsyncMock(return_value=([], 0))
        await product_svc.get_products(status="on_sale", product_type="dc_charger", search="fast")
        product_svc.product_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, status="on_sale", product_type="dc_charger", search="fast",
        )

    async def test_get_by_id_found(self, product_svc, mock_product):
        """Get product by existing ID."""
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)
        result = await product_svc.get_product("p-001")
        assert result is not None
        assert result.id == "p-001"

    async def test_get_by_id_not_found(self, product_svc):
        """Get product by non-existent ID returns None."""
        product_svc.product_repo.get_by_id = AsyncMock(return_value=None)
        result = await product_svc.get_product("nonexistent")
        assert result is None


# ---------------------------------------------------------------------------
# update_product
# ---------------------------------------------------------------------------


class TestUpdateProduct:
    async def test_update_success(self, product_svc, mock_db, mock_product):
        """Update product fields."""
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)
        product_svc.product_repo.update = AsyncMock(return_value=mock_product)

        result = await product_svc.update_product("p-001", {"name": "Updated Name"}, "u-001")

        assert result.name == "Updated Name"
        mock_db.commit.assert_awaited_once()

    async def test_update_not_found(self, product_svc):
        """Update non-existent product raises NotFoundError."""
        product_svc.product_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError, match="Product not found"):
            await product_svc.update_product("bad-id", {"name": "X"})


# ---------------------------------------------------------------------------
# transition_lifecycle
# ---------------------------------------------------------------------------


class TestTransitionLifecycle:
    async def test_valid_transition(self, product_svc, mock_db, mock_product, mock_lifecycle_log):
        """Valid lifecycle transition creates log entry and updates status."""
        mock_product.lifecycle_status = "in_development"
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)
        product_svc.product_repo.update = AsyncMock()
        product_svc.lifecycle_log_repo.create = AsyncMock(return_value=mock_lifecycle_log)

        product, log = await product_svc.transition_lifecycle(
            "p-001", "trial_handover", "u-001", "Design complete"
        )

        assert product.lifecycle_status == "trial_handover"
        assert log.from_status == "in_development"
        assert log.to_status == "trial_handover"
        mock_db.commit.assert_awaited_once()

    async def test_invalid_transition(self, product_svc, mock_product):
        """Invalid lifecycle transition raises BadRequestError."""
        mock_product.lifecycle_status = "on_sale"
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)

        with pytest.raises(BadRequestError, match="Invalid transition"):
            await product_svc.transition_lifecycle("p-001", "in_development", "u-001")

    async def test_transition_from_eol(self, product_svc, mock_product):
        """EOL is terminal — no transitions allowed."""
        mock_product.lifecycle_status = "eol"
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)

        with pytest.raises(BadRequestError, match="Allowed: \\[\\]"):
            await product_svc.transition_lifecycle("p-001", "discontinued", "u-001")

    async def test_transition_not_found(self, product_svc):
        """Transition on non-existent product raises NotFoundError."""
        product_svc.product_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError, match="Product not found"):
            await product_svc.transition_lifecycle("bad-id", "on_sale", "u-001")

    @pytest.mark.parametrize("from_status,to_status,should_publish", [
        ("on_sale", "discontinued", True),
        ("in_development", "trial_handover", False),
        ("trial_handover", "on_sale", False),
        ("discontinued", "eol", False),
    ])
    async def test_discontinued_triggers_event(self, product_svc, mock_db, mock_product,
                                                mock_lifecycle_log, from_status, to_status, should_publish):
        """Discontinued status publishes PRODUCT_DISCONTINUED event."""
        mock_product.lifecycle_status = from_status
        mock_product.name = "AC Charger"
        product_svc.product_repo.get_by_id = AsyncMock(return_value=mock_product)
        product_svc.product_repo.update = AsyncMock()
        product_svc.lifecycle_log_repo.create = AsyncMock(return_value=mock_lifecycle_log)

        with patch("app.services.product_service.event_bus.publish", AsyncMock()) as publish_mock:
            await product_svc.transition_lifecycle("p-001", to_status, "u-001")

            if should_publish:
                publish_mock.assert_awaited_once_with(
                    Topics.PRODUCT_DISCONTINUED,
                    {"product_id": "p-001", "product_name": "AC Charger"},
                )
            else:
                publish_mock.assert_not_called()


# ---------------------------------------------------------------------------
# get_lifecycle_logs
# ---------------------------------------------------------------------------


class TestGetLifecycleLogs:
    async def test_get_logs(self, product_svc, mock_lifecycle_log):
        """Retrieve lifecycle change logs for a product."""
        product_svc.lifecycle_log_repo.get_by_product = AsyncMock(return_value=[mock_lifecycle_log])
        logs = await product_svc.get_lifecycle_logs("p-001")
        assert len(logs) == 1
        assert logs[0].from_status == "in_development"

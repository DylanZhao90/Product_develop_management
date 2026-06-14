"""SupplierService + FirmwareService + DesignService tests."""
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import NotFoundError
from app.services.supplier_service import SupplierService
from app.services.firmware_service import FirmwareService
from app.services.design_service import DesignService
from tests.conftest import make_mock_supplier, make_mock_firmware_version, make_mock_design_file


@pytest.fixture
def supplier_svc(mock_db):
    return SupplierService(mock_db)


@pytest.fixture
def firmware_svc(mock_db):
    return FirmwareService(mock_db)


@pytest.fixture
def design_svc(mock_db):
    return DesignService(mock_db)


class TestSupplierService:
    async def test_create(self, supplier_svc, mock_db):
        supplier_svc.supplier_repo.create = AsyncMock()
        result = await supplier_svc.create_supplier({"name": "Acme", "type": "design"}, "u-001")
        assert result.name == "Acme"
        mock_db.commit.assert_awaited_once()

    async def test_get_all(self, supplier_svc):
        supplier_svc.supplier_repo.get_all = AsyncMock(return_value=([make_mock_supplier()], 1))
        results, total = await supplier_svc.get_suppliers()
        assert total == 1

    async def test_update_not_found(self, supplier_svc):
        supplier_svc.supplier_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await supplier_svc.update_supplier("bad", {"name": "X"})

    async def test_create_outsource_task(self, supplier_svc, mock_db):
        supplier_svc.task_repo.create = AsyncMock()
        result = await supplier_svc.create_outsource_task(
            {"supplier_id": "s-001", "title": "PCB Layout"}, "u-001"
        )
        assert result.title == "PCB Layout"
        mock_db.commit.assert_awaited_once()

    async def test_review_outsource_task(self, supplier_svc, mock_db):
        from tests.conftest import make_mock_outsource_task
        task = make_mock_outsource_task()
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=task)
        supplier_svc.task_repo.update = AsyncMock(return_value=task)
        result = await supplier_svc.review_outsource_task(
            "ot-001", {"review_status": "approved", "review_comment": "Looks good"}, "u-001"
        )
        assert result.review_status == "approved"


class TestFirmwareService:
    async def test_create_version(self, firmware_svc, mock_db):
        firmware_svc.version_repo.create = AsyncMock()
        result = await firmware_svc.create_version(
            {"product_model": "AC-1000", "version": "1.0.0", "file_url": "fw/key"}, "u-001"
        )
        assert result.version == "1.0.0"
        mock_db.commit.assert_awaited_once()

    async def test_get_versions(self, firmware_svc):
        firmware_svc.version_repo.get_all = AsyncMock(return_value=([make_mock_firmware_version()], 1))
        results, total = await firmware_svc.get_versions()
        assert total == 1

    async def test_create_upgrade_task(self, firmware_svc, mock_db):
        firmware_svc.task_repo.create = AsyncMock()
        result = await firmware_svc.create_upgrade_task(
            {"firmware_version_id": "fv-001", "gray_scale_percent": 50}, "u-001"
        )
        assert result.gray_scale_percent == 50

    async def test_cancel_upgrade_task(self, firmware_svc, mock_db):
        from tests.conftest import make_mock_upgrade_task
        task = make_mock_upgrade_task(status="scheduled")
        firmware_svc.task_repo.get_by_id = AsyncMock(return_value=task)
        firmware_svc.task_repo.update = AsyncMock(return_value=task)
        result = await firmware_svc.cancel_upgrade_task("ut-001", "u-001")
        assert result.status == "failed"

    async def test_upgrade_task_not_found(self, firmware_svc):
        firmware_svc.task_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await firmware_svc.update_upgrade_task("bad", {"status": "completed"})


class TestDesignService:
    async def test_get_all(self, design_svc):
        design_svc.repo.get_all = AsyncMock(return_value=([make_mock_design_file()], 1))
        results, total = await design_svc.get_design_files()
        assert total == 1

    async def test_update_not_found(self, design_svc):
        design_svc.repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await design_svc.update_design_file("bad", {"file_name": "X"})

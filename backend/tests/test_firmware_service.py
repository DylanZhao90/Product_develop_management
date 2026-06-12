"""FirmwareService tests — mock DB, repos, MinIO, audit."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.firmware import FirmwareUpgradeTask, FirmwareVersion
from app.services.firmware_service import FirmwareService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def fw_service(mock_db):
    return FirmwareService(mock_db)


def make_version(**kw) -> FirmwareVersion:
    defaults = {
        "id": "fw-001",
        "product_model": "Model-X",
        "version": "1.0.0",
        "file_url": "firmware/Model-X/1.0.0/fw.bin",
        "file_size": 1024,
        "file_hash": "abc123",
        "release_notes": "Initial release",
        "release_type": "full",
        "released_by": "user-1",
    }
    defaults.update(kw)
    return FirmwareVersion(**defaults)


def make_task(**kw) -> FirmwareUpgradeTask:
    defaults = {
        "id": "task-001",
        "firmware_version_id": "fw-001",
        "target_sn_filter": None,
        "gray_scale_percent": 100,
        "status": "scheduled",
        "success_count": 0,
        "failure_count": 0,
        "total_count": 0,
        "created_by": "user-1",
    }
    defaults.update(kw)
    return FirmwareUpgradeTask(**defaults)


class TestCreateVersion:
    @patch("app.services.firmware_service.AuditLogger")
    async def test_create_version_maps_fields(self, mock_audit, fw_service):
        data = {
            "product_model": "Model-Y",
            "version": "2.0.0",
            "file_url": "firmware/Model-Y/2.0.0/fw.bin",
            "file_size": 2048,
            "file_hash": "def456",
            "release_notes": "Major update",
            "release_type": "full",
        }
        created = make_version(product_model="Model-Y", version="2.0.0")
        fw_service.version_repo.create = AsyncMock(return_value=created)

        result = await fw_service.create_version(data, created_by="user-1")

        assert result.product_model == "Model-Y"
        assert result.version == "2.0.0"
        fw_service.version_repo.create.assert_awaited_once()

    @patch("app.services.firmware_service.AuditLogger")
    async def test_create_version_defaults_release_type(self, mock_audit, fw_service):
        data = {
            "product_model": "Model-Z",
            "version": "3.0.0",
            "file_url": "fw/3.bin",
        }
        created = make_version(product_model="Model-Z", version="3.0.0", release_type="full")
        fw_service.version_repo.create = AsyncMock(return_value=created)

        result = await fw_service.create_version(data, created_by="user-1")
        assert result.release_type == "full"


class TestGetVersions:
    async def test_get_versions_delegates(self, fw_service):
        fw_service.version_repo.get_all = AsyncMock(return_value=([], 0))

        await fw_service.get_versions(product_model="Model-X")

        fw_service.version_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, product_model="Model-X"
        )

    async def test_get_version_with_download_url(self, fw_service):
        v = make_version()
        fw_service.version_repo.get_by_id = AsyncMock(return_value=v)

        with patch("app.services.firmware_service.get_file_url", return_value="http://minio/fw.bin"):
            result = await fw_service.get_version("fw-001")

        assert result._download_url == "http://minio/fw.bin"

    async def test_get_version_not_found(self, fw_service):
        fw_service.version_repo.get_by_id = AsyncMock(return_value=None)
        result = await fw_service.get_version("no-such")
        assert result is None


class TestUpgradeTasks:
    @patch("app.services.firmware_service.AuditLogger")
    async def test_create_upgrade_task(self, mock_audit, fw_service):
        data = {
            "firmware_version_id": "fw-001",
            "target_sn_filter": {"models": ["Model-X"]},
            "gray_scale_percent": 50,
        }
        created = make_task(gray_scale_percent=50)
        fw_service.task_repo.create = AsyncMock(return_value=created)

        result = await fw_service.create_upgrade_task(data, created_by="user-1")

        assert result.gray_scale_percent == 50
        fw_service.task_repo.create.assert_awaited_once()

    async def test_get_upgrade_tasks_delegates(self, fw_service):
        fw_service.task_repo.get_all = AsyncMock(return_value=([], 0))

        await fw_service.get_upgrade_tasks(status="scheduled")

        fw_service.task_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, firmware_version_id=None, status="scheduled"
        )

    async def test_get_upgrade_task(self, fw_service):
        expected = make_task()
        fw_service.task_repo.get_by_id = AsyncMock(return_value=expected)

        result = await fw_service.get_upgrade_task("task-001")
        assert result == expected

    async def test_update_upgrade_task_not_found_raises(self, fw_service):
        fw_service.task_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Upgrade task not found"):
            await fw_service.update_upgrade_task("no-such", {})

    async def test_update_upgrade_task(self, fw_service):
        task = make_task(gray_scale_percent=100)
        fw_service.task_repo.get_by_id = AsyncMock(return_value=task)
        fw_service.task_repo.update = AsyncMock(return_value=task)

        result = await fw_service.update_upgrade_task("task-001", {"gray_scale_percent": 20})

        assert result.gray_scale_percent == 20

    async def test_cancel_upgrade_task(self, fw_service):
        task = make_task(status="scheduled")
        fw_service.task_repo.get_by_id = AsyncMock(return_value=task)
        fw_service.task_repo.update = AsyncMock(return_value=task)

        result = await fw_service.cancel_upgrade_task("task-001")

        assert result.status == "failed"
        fw_service.task_repo.update.assert_awaited_once()

    async def test_cancel_not_found_raises(self, fw_service):
        fw_service.task_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Upgrade task not found"):
            await fw_service.cancel_upgrade_task("no-such")

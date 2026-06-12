"""DesignService tests — mock DB, repo, MinIO, audit."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.design import DesignFile
from app.services.design_service import DesignService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def design_svc(mock_db):
    return DesignService(mock_db)


def make_file(**kw) -> DesignFile:
    defaults = {
        "id": "df-001",
        "product_id": "prod-001",
        "file_name": "pcb-layout.step",
        "file_type": "step",
        "version": 1,
        "file_url": "design/prod-001/pcb-layout.step",
        "file_size": 5120,
        "uploaded_by": "user-1",
        "is_current": True,
        "change_notes": "Initial design",
    }
    defaults.update(kw)
    return DesignFile(**defaults)


class TestCreateDesignFile:
    @patch("app.services.design_service.AuditLogger")
    async def test_create_design_file_maps_fields(self, mock_audit, design_svc):
        design_svc.repo.get_latest_version = AsyncMock(return_value=1)
        created = make_file()
        design_svc.repo.create = AsyncMock(return_value=created)

        data = {
            "product_id": "prod-001",
            "file_name": "pcb-layout.step",
            "file_type": "step",
            "file_url": "design/prod-001/pcb-layout.step",
        }

        result = await design_svc.create_design_file(data, created_by="user-1")

        assert result.version == 1
        assert result.file_name == "pcb-layout.step"
        design_svc.repo.get_latest_version.assert_awaited_once_with("prod-001", "pcb-layout.step")

    @patch("app.services.design_service.AuditLogger")
    async def test_create_design_file_version_increments(self, mock_audit, design_svc):
        design_svc.repo.get_latest_version = AsyncMock(return_value=4)
        created = make_file(version=4)
        design_svc.repo.create = AsyncMock(return_value=created)

        data = {
            "product_id": "prod-001",
            "file_name": "pcb-layout.step",
            "file_type": "step",
            "file_url": "design/prod-001/pcb-layout.step",
        }

        result = await design_svc.create_design_file(data, created_by="user-1")

        assert result.version == 4


class TestGetDesignFiles:
    async def test_get_design_files_delegates(self, design_svc):
        design_svc.repo.get_all = AsyncMock(return_value=([], 0))

        await design_svc.get_design_files(product_id="prod-001", file_type="step")

        design_svc.repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, product_id="prod-001", file_type="step", search=None
        )

    async def test_get_design_file_by_id(self, design_svc):
        expected = make_file()
        design_svc.repo.get_by_id = AsyncMock(return_value=expected)

        result = await design_svc.get_design_file("df-001")
        assert result == expected

    async def test_get_design_file_not_found(self, design_svc):
        design_svc.repo.get_by_id = AsyncMock(return_value=None)
        result = await design_svc.get_design_file("no-such")
        assert result is None

    async def test_get_design_file_with_url(self, design_svc):
        f = make_file()
        design_svc.repo.get_by_id = AsyncMock(return_value=f)

        with patch("app.services.design_service.get_file_url", return_value="http://minio/df.bin"):
            result = await design_svc.get_design_file_with_url("df-001")

        assert result._download_url == "http://minio/df.bin"


class TestVersions:
    async def test_get_versions_delegates(self, design_svc):
        design_svc.repo.get_versions = AsyncMock(return_value=[])
        result = await design_svc.get_versions("df-001")
        design_svc.repo.get_versions.assert_awaited_once_with("df-001")


class TestUpdateDesignFile:
    async def test_update_updates_fields(self, design_svc):
        existing = make_file(file_name="old.step")
        design_svc.repo.get_by_id = AsyncMock(return_value=existing)
        design_svc.repo.update = AsyncMock(return_value=existing)

        result = await design_svc.update_design_file("df-001", {"file_name": "new.step"})

        assert result.file_name == "new.step"

    async def test_update_not_found_raises(self, design_svc):
        design_svc.repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Design file not found"):
            await design_svc.update_design_file("no-such", {})

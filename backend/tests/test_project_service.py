"""ProjectService tests — CRUD, status transitions, tasks, issues, error cases."""
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import BadRequestError, NotFoundError
from app.services.project_service import ProjectService
from tests.conftest import make_mock_project, make_mock_project_task, make_mock_technical_issue


@pytest.fixture
def project_svc(mock_db):
    return ProjectService(mock_db)


class TestCreateProject:
    async def test_create_success(self, project_svc, mock_db):
        project_svc.project_repo.create = AsyncMock()
        result = await project_svc.create_project({"product_id": "p-001", "name": "V2 Upgrade"}, "u-001")
        assert result.name == "V2 Upgrade"
        assert result.status == "pending_approval"
        mock_db.commit.assert_awaited_once()

    async def test_create_with_type(self, project_svc):
        project_svc.project_repo.create = AsyncMock()
        result = await project_svc.create_project(
            {"product_id": "p-001", "name": "Bugfix", "type": "version_upgrade"}, "u-001"
        )
        assert result.type == "version_upgrade"


class TestGetProjects:
    async def test_get_all(self, project_svc):
        project_svc.project_repo.get_all = AsyncMock(return_value=([make_mock_project()], 1))
        results, total = await project_svc.get_projects()
        assert total == 1

    async def test_get_with_filters(self, project_svc):
        project_svc.project_repo.get_all = AsyncMock(return_value=([], 0))
        await project_svc.get_projects(product_id="p-001", status="approved")
        project_svc.project_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, product_id="p-001", status="approved"
        )

    async def test_get_by_id(self, project_svc):
        p = make_mock_project()
        project_svc.project_repo.get_by_id = AsyncMock(return_value=p)
        assert await project_svc.get_project("prj-001") is p

    async def test_get_by_id_none(self, project_svc):
        project_svc.project_repo.get_by_id = AsyncMock(return_value=None)
        assert await project_svc.get_project("bad") is None


class TestUpdateProject:
    async def test_update_success(self, project_svc, mock_db):
        p = make_mock_project(status="approved")
        project_svc.project_repo.get_by_id = AsyncMock(return_value=p)
        project_svc.project_repo.update = AsyncMock(return_value=p)
        result = await project_svc.update_project("prj-001", {"name": "Renamed"}, "u-001")
        assert result.name == "Renamed"
        mock_db.commit.assert_awaited_once()

    async def test_update_valid_status_transition(self, project_svc, mock_db):
        p = make_mock_project(status="pending_approval")
        project_svc.project_repo.get_by_id = AsyncMock(return_value=p)
        project_svc.project_repo.update = AsyncMock(return_value=p)
        result = await project_svc.update_project("prj-001", {"status": "approved"}, "u-001")
        assert result.status == "approved"

    async def test_update_invalid_transition(self, project_svc):
        p = make_mock_project(status="completed")
        project_svc.project_repo.get_by_id = AsyncMock(return_value=p)
        with pytest.raises(BadRequestError):
            await project_svc.update_project("prj-001", {"status": "in_progress"}, "u-001")

    async def test_update_not_found(self, project_svc):
        project_svc.project_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await project_svc.update_project("bad", {"name": "X"})


class TestTasks:
    async def test_create_task(self, project_svc, mock_db):
        project_svc.task_repo.create = AsyncMock()
        result = await project_svc.create_task("prj-001", {"name": "Design PCB"}, "u-001")
        assert result.name == "Design PCB"
        mock_db.commit.assert_awaited_once()

    async def test_create_task_with_assignee(self, project_svc, mock_db):
        project_svc.task_repo.create = AsyncMock()
        result = await project_svc.create_task(
            "prj-001", {"name": "Review", "assignee_feishu_id": "ou_123"}, "u-001"
        )
        assert result.assignee_feishu_id == "ou_123"

    async def test_get_tasks(self, project_svc):
        project_svc.task_repo.get_by_project = AsyncMock(return_value=[make_mock_project_task()])
        tasks = await project_svc.get_tasks("prj-001")
        assert len(tasks) == 1

    async def test_get_task_tree(self, project_svc):
        root = make_mock_project_task(id="t-root", name="Root")
        child = make_mock_project_task(id="t-child", name="Child", parent_task_id="t-root")
        project_svc.task_repo.get_by_project = AsyncMock(return_value=[root, child])
        tree = await project_svc.get_task_tree("prj-001")
        assert len(tree) == 1
        assert len(tree[0]["children"]) == 1

    async def test_update_task_not_found(self, project_svc):
        project_svc.task_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await project_svc.update_task("bad", {"name": "X"})


class TestIssues:
    async def test_create_issue(self, project_svc, mock_db):
        project_svc.issue_repo.create = AsyncMock()
        result = await project_svc.create_issue("prj-001", {"title": "Overheating", "severity": "critical"}, "u-001")
        assert result.severity == "critical"
        mock_db.commit.assert_awaited_once()

    async def test_get_issues(self, project_svc):
        project_svc.issue_repo.get_by_project = AsyncMock(return_value=[make_mock_technical_issue()])
        issues = await project_svc.get_issues("prj-001")
        assert len(issues) == 1

    async def test_update_issue_not_found(self, project_svc):
        project_svc.issue_repo.get_by_id = AsyncMock(return_value=None)
        with pytest.raises(NotFoundError):
            await project_svc.update_issue("bad", {"status": "resolved"})

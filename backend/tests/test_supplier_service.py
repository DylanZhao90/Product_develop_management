"""SupplierService tests — mock DB, repos, audit."""

from unittest.mock import AsyncMock, patch

import pytest

from app.models.supplier import OutsourceTask, Supplier
from app.services.supplier_service import SupplierService


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def supplier_svc(mock_db):
    return SupplierService(mock_db)


def make_supplier(**kw) -> Supplier:
    defaults = {
        "id": "sup-001",
        "name": "Acme Components",
        "type": "design",
        "contact_name": "John Doe",
        "contact_email": "john@acme.com",
        "contact_feishu_id": None,
        "qualification_files": [],
        "rating": None,
        "on_time_delivery_rate": None,
        "status": "active",
        "notes": None,
    }
    defaults.update(kw)
    return Supplier(**defaults)


def make_task(**kw) -> OutsourceTask:
    defaults = {
        "id": "task-001",
        "supplier_id": "sup-001",
        "project_task_id": None,
        "title": "PCB Layout",
        "rfq_url": None,
        "quotation_amount": 5000.0,
        "deliverable_urls": None,
        "review_status": "pending_review",
        "review_comment": None,
    }
    defaults.update(kw)
    return OutsourceTask(**defaults)


class TestSupplierCRUD:
    @patch("app.services.supplier_service.AuditLogger")
    async def test_create_supplier(self, mock_audit, supplier_svc):
        data = {
            "name": "Beta Electronics",
            "type": "module_dev",
            "contact_name": "Jane Smith",
            "contact_email": "jane@beta.com",
        }
        created = make_supplier(name="Beta Electronics", type="module_dev")
        supplier_svc.supplier_repo.create = AsyncMock(return_value=created)

        result = await supplier_svc.create_supplier(data, created_by="user-1")

        assert result.name == "Beta Electronics"
        assert result.type == "module_dev"
        supplier_svc.supplier_repo.create.assert_awaited_once()

    async def test_get_suppliers_delegates(self, supplier_svc):
        supplier_svc.supplier_repo.get_all = AsyncMock(return_value=([], 0))

        await supplier_svc.get_suppliers(supplier_type="design", status="active")

        supplier_svc.supplier_repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, supplier_type="design", status="active", search=None
        )

    async def test_get_supplier_by_id(self, supplier_svc):
        expected = make_supplier()
        supplier_svc.supplier_repo.get_by_id = AsyncMock(return_value=expected)

        result = await supplier_svc.get_supplier("sup-001")
        assert result == expected

    async def test_update_supplier(self, supplier_svc):
        existing = make_supplier(name="Old Name")
        supplier_svc.supplier_repo.get_by_id = AsyncMock(return_value=existing)
        supplier_svc.supplier_repo.update = AsyncMock(return_value=existing)

        result = await supplier_svc.update_supplier("sup-001", {"name": "New Name"})

        assert result.name == "New Name"

    async def test_update_supplier_not_found_raises(self, supplier_svc):
        supplier_svc.supplier_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Supplier not found"):
            await supplier_svc.update_supplier("no-such", {})


class TestOutsourceTasks:
    @patch("app.services.supplier_service.AuditLogger")
    async def test_create_outsource_task(self, mock_audit, supplier_svc):
        data = {
            "supplier_id": "sup-001",
            "title": "PCB Layout",
            "quotation_amount": 5000.0,
        }
        created = make_task()
        supplier_svc.task_repo.create = AsyncMock(return_value=created)

        result = await supplier_svc.create_outsource_task(data, created_by="user-1")

        assert result.title == "PCB Layout"
        assert result.quotation_amount == 5000.0

    async def test_get_outsource_tasks_by_supplier(self, supplier_svc):
        supplier_svc.task_repo.get_by_supplier = AsyncMock(return_value=[])

        await supplier_svc.get_outsource_tasks("sup-001")

        supplier_svc.task_repo.get_by_supplier.assert_awaited_once_with("sup-001")

    async def test_get_outsource_task_by_id(self, supplier_svc):
        expected = make_task()
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=expected)

        result = await supplier_svc.get_outsource_task("task-001")
        assert result == expected

    async def test_update_outsource_task(self, supplier_svc):
        task = make_task(title="Old Title")
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=task)
        supplier_svc.task_repo.update = AsyncMock(return_value=task)

        result = await supplier_svc.update_outsource_task("task-001", {"title": "New Title"})

        assert result.title == "New Title"

    async def test_update_outsource_task_not_found_raises(self, supplier_svc):
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Outsource task not found"):
            await supplier_svc.update_outsource_task("no-such", {})

    @patch("app.services.supplier_service.AuditLogger")
    async def test_review_outsource_task_approved(self, mock_audit, supplier_svc):
        task = make_task(review_status="pending_review")
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=task)
        supplier_svc.task_repo.update = AsyncMock(return_value=task)

        result = await supplier_svc.review_outsource_task(
            "task-001",
            {"review_status": "approved", "review_comment": "Looks good"},
            reviewer_id="reviewer-1",
        )

        assert result.review_status == "approved"
        assert result.review_comment == "Looks good"
        mock_audit.log.assert_awaited_once()

    @patch("app.services.supplier_service.AuditLogger")
    async def test_review_outsource_task_rejected(self, mock_audit, supplier_svc):
        task = make_task()
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=task)
        supplier_svc.task_repo.update = AsyncMock(return_value=task)

        result = await supplier_svc.review_outsource_task(
            "task-001",
            {"review_status": "rejected", "review_comment": "Quality issues"},
            reviewer_id="reviewer-1",
        )

        assert result.review_status == "rejected"

    @patch("app.services.supplier_service.AuditLogger")
    async def test_review_not_found_raises(self, mock_audit, supplier_svc):
        supplier_svc.task_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Outsource task not found"):
            await supplier_svc.review_outsource_task(
                "no-such", {"review_status": "approved"}, reviewer_id="r-1"
            )

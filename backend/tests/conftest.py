"""Pytest configuration and fixtures."""
import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.event_bus import event_bus
from app.main import app

# ---------------------------------------------------------------------------
# Helper factories — create mock model instances with required attrs
# ---------------------------------------------------------------------------


def _make_mock_model(cls, **overrides):
    """Create a MagicMock spec-ed to *cls* with default-pk and given attrs."""
    instance = MagicMock(spec=cls)
    # Default str(id) — a UUID-like hex string
    instance.id = "00000000-0000-0000-0000-000000000001"
    instance.__class__ = cls
    for k, v in overrides.items():
        setattr(instance, k, v)
    return instance


def make_mock_product(**kw):
    defaults = {
        "id": "p-001",
        "code": "AC-2026-0001",
        "model": "AC-1000",
        "name": "AC Charger",
        "type": "ac_charger",
        "target_markets": [],
        "certification_requirements": [],
        "lifecycle_status": "in_development",
        "product_manager_id": "u-001",
        "thumbnail_url": None,
        "description": "A test product",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.product", fromlist=["Product"]).Product, **defaults)


def make_mock_project(**kw):
    defaults = {
        "id": "prj-001",
        "product_id": "p-001",
        "name": "Test Project",
        "type": "new_product",
        "feasibility_doc_url": None,
        "approval_id": None,
        "feishu_chat_id": None,
        "status": "pending_approval",
        "created_by": "u-001",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.project", fromlist=["Project"]).Project, **defaults)


def make_mock_project_task(**kw):
    defaults = {
        "id": "t-001",
        "project_id": "prj-001",
        "name": "Design PCB",
        "parent_task_id": None,
        "responsible_role": "engineer",
        "assignee_feishu_id": None,
        "supplier_id": None,
        "planned_start": None,
        "planned_end": None,
        "deliverables": [],
        "status": "pending",
        "sort_order": 0,
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.project", fromlist=["ProjectTask"]).ProjectTask, **defaults)


def make_mock_technical_issue(**kw):
    defaults = {
        "id": "i-001",
        "project_id": "prj-001",
        "title": "Overheating issue",
        "description": "Unit runs hot at full load",
        "severity": "critical",
        "assigned_to": None,
        "status": "open",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.project", fromlist=["TechnicalIssue"]).TechnicalIssue, **defaults)


def make_mock_certification(**kw):
    defaults = {
        "id": "c-001",
        "product_id": "p-001",
        "cert_type": "CE",
        "cert_number": "CE-12345",
        "issued_by": "TUV",
        "issue_date": None,
        "expiry_date": None,
        "cert_file_url": None,
        "status": "valid",
        "remind_before_days": 90,
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.certification", fromlist=["Certification"]).Certification, **defaults)


def make_mock_user(**kw):
    defaults = {
        "id": "u-001",
        "feishu_open_id": "open_id_123",
        "feishu_union_id": "union_id_123",
        "name": "Alice",
        "email": "alice@example.com",
        "avatar_url": None,
        "role": "engineer",
        "supplier_id": None,
        "language_pref": "zh-CN",
        "is_active": True,
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.user", fromlist=["User"]).User, **defaults)


def make_mock_supplier(**kw):
    defaults = {
        "id": "s-001",
        "name": "Acme Corp",
        "type": "design",
        "contact_name": "Bob",
        "contact_email": "bob@acme.com",
        "contact_feishu_id": None,
        "qualification_files": [],
        "rating": 4.5,
        "on_time_delivery_rate": 95.0,
        "status": "active",
        "notes": "Reliable partner",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.supplier", fromlist=["Supplier"]).Supplier, **defaults)


def make_mock_outsource_task(**kw):
    defaults = {
        "id": "ot-001",
        "supplier_id": "s-001",
        "project_task_id": None,
        "title": "PCB Layout",
        "rfq_url": None,
        "quotation_amount": None,
        "deliverable_urls": None,
        "review_status": "pending_review",
        "review_comment": None,
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.supplier", fromlist=["OutsourceTask"]).OutsourceTask, **defaults)


def make_mock_firmware_version(**kw):
    defaults = {
        "id": "fv-001",
        "product_model": "AC-1000",
        "version": "1.0.0",
        "file_url": "firmware/AC-1000/1.0.0/fw.bin",
        "file_size": 1024,
        "file_hash": "abc123",
        "release_notes": "Initial release",
        "release_type": "full",
        "released_by": "u-001",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.firmware", fromlist=["FirmwareVersion"]).FirmwareVersion, **defaults)


def make_mock_upgrade_task(**kw):
    defaults = {
        "id": "ut-001",
        "firmware_version_id": "fv-001",
        "target_sn_filter": None,
        "gray_scale_percent": 100,
        "status": "scheduled",
        "success_count": 0,
        "failure_count": 0,
        "total_count": 0,
        "failure_reasons": None,
        "feishu_notification_sent": False,
        "created_by": "u-001",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.firmware", fromlist=["FirmwareUpgradeTask"]).FirmwareUpgradeTask, **defaults)


def make_mock_design_file(**kw):
    defaults = {
        "id": "df-001",
        "product_id": "p-001",
        "file_name": "schematic_v2.step",
        "file_type": "step",
        "version": 2,
        "file_url": "design/p-001/schematic_v2.step",
        "file_size": 2048,
        "uploaded_by": "u-001",
        "is_current": True,
        "change_notes": "Updated traces",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.design", fromlist=["DesignFile"]).DesignFile, **defaults)


def make_mock_lifecycle_log(**kw):
    defaults = {
        "id": "lcl-001",
        "product_id": "p-001",
        "from_status": "in_development",
        "to_status": "trial_handover",
        "approval_id": None,
        "changed_by": "u-001",
        "reason": "Design complete",
    }
    defaults.update(kw)
    return _make_mock_model(__import__("app.models.product", fromlist=["LifecycleChangeLog"]).LifecycleChangeLog, **defaults)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def mock_db() -> AsyncSession:
    """Mock DB session that returns empty results by default."""
    event_bus.clear()
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.flush = AsyncMock()
    session.add = AsyncMock()
    session.execute = AsyncMock()
    session.scalar = AsyncMock()
    session.scalar.return_value = 0
    return session


@pytest_asyncio.fixture
async def async_client(mock_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client with mocked DB dependency."""
    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _patch_audit_logger():
    """Prevent AuditLogger from creating real DB sessions in all tests."""
    with patch("app.middleware.audit.async_session"), \
         patch("app.middleware.audit.AuditLogger.log", return_value=None):
        yield

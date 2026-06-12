"""CertificationService tests — mock DB + repo layer."""

from datetime import date, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.certification import Certification
from app.services.certification_service import CertificationService


@pytest.fixture
def mock_db():
    db = AsyncMock()
    return db


@pytest.fixture
def cert(mock_db):
    return CertificationService(mock_db)


def make_cert(**kw) -> Certification:
    defaults = {
        "id": "cert-001",
        "product_id": "prod-001",
        "cert_type": "CE",
        "cert_number": "CE-2026-001",
        "issued_by": "TUV",
        "issue_date": date(2026, 1, 1),
        "expiry_date": date(2027, 1, 1),
        "cert_file_url": "certs/ce-cert.pdf",
        "remind_before_days": 90,
        "status": "valid",
    }
    defaults.update(kw)
    return Certification(**defaults)


class TestCreateCertification:
    @patch("app.services.certification_service.AuditLogger")
    async def test_create_certification_maps_fields(self, mock_audit, cert, mock_db):
        data = {
            "product_id": "prod-001",
            "cert_type": "FCC",
            "cert_number": "FCC-001",
            "issued_by": "FCC Lab",
            "issue_date": date(2026, 6, 1),
            "expiry_date": date(2027, 6, 1),
            "cert_file_url": "certs/fcc.pdf",
        }
        created = make_cert(cert_type="FCC", cert_number="FCC-001")

        cert.repo.create = AsyncMock(return_value=created)

        result = await cert.create_certification(data, created_by="user-1")

        assert result.cert_type == "FCC"
        assert result.cert_number == "FCC-001"
        cert.repo.create.assert_awaited_once()

    @patch("app.services.certification_service.AuditLogger")
    async def test_create_uses_default_remind_days(self, mock_audit, cert, mock_db):
        data = {"product_id": "prod-001", "cert_type": "UL"}
        created = make_cert(cert_type="UL", remind_before_days=90)

        cert.repo.create = AsyncMock(return_value=created)

        result = await cert.create_certification(data, created_by="user-1")

        assert result.remind_before_days == 90
        mock_audit.log.assert_awaited_once()


class TestGetCertifications:
    async def test_get_certifications_delegates_to_repo(self, cert):
        cert.repo.get_all = AsyncMock(return_value=([], 0))

        result = await cert.get_certifications(product_id="prod-001", cert_type="CE")

        cert.repo.get_all.assert_awaited_once_with(
            skip=0, limit=20, product_id="prod-001", cert_type="CE", status=None
        )

    async def test_get_certification_by_id(self, cert):
        expected = make_cert()
        cert.repo.get_by_id = AsyncMock(return_value=expected)

        result = await cert.get_certification("cert-001")

        assert result == expected
        cert.repo.get_by_id.assert_awaited_once_with("cert-001")

    async def test_get_certification_not_found(self, cert):
        cert.repo.get_by_id = AsyncMock(return_value=None)
        result = await cert.get_certification("no-such-cert")
        assert result is None


class TestUpdateCertification:
    async def test_update_updates_fields(self, cert):
        existing = make_cert(cert_number="OLD-001")
        cert.repo.get_by_id = AsyncMock(return_value=existing)
        cert.repo.update = AsyncMock(return_value=existing)

        result = await cert.update_certification("cert-001", {"cert_number": "NEW-001"})

        assert result.cert_number == "NEW-001"

    async def test_update_not_found_raises(self, cert):
        cert.repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(ValueError, match="Certification not found"):
            await cert.update_certification("no-such", {"cert_number": "X"})


class TestExpiryLogic:
    async def test_get_expiring_delegates(self, cert):
        cert.repo.get_expiring = AsyncMock(return_value=[])
        result = await cert.get_expiring(days=30)
        cert.repo.get_expiring.assert_awaited_once_with(days=30)

    async def test_check_expiry_updates_expired(self, cert):
        today = date.today()
        expired = make_cert(
            id="cert-e",
            status="valid",
            expiry_date=today - timedelta(days=1),
        )
        valid = make_cert(
            id="cert-v",
            status="valid",
            expiry_date=today + timedelta(days=365),
        )
        cert.repo.get_all = AsyncMock(return_value=([expired, valid], 2))
        cert.repo.update = AsyncMock()

        count = await cert.check_expiry_and_update_status()

        assert expired.status == "expired"
        assert count == 1

    async def test_check_expiry_updates_expiring_soon(self, cert):
        today = date.today()
        soon = make_cert(
            id="cert-s",
            status="valid",
            expiry_date=today + timedelta(days=30),
            remind_before_days=60,
        )
        cert.repo.get_all = AsyncMock(return_value=([soon], 1))
        cert.repo.update = AsyncMock()

        count = await cert.check_expiry_and_update_status()

        assert soon.status == "expiring_soon"
        assert count == 1

    async def test_check_expiry_skips_already_correct_status(self, cert):
        today = date.today()
        already = make_cert(
            id="cert-a",
            status="expired",
            expiry_date=today - timedelta(days=10),
        )
        cert.repo.get_all = AsyncMock(return_value=([already], 1))

        count = await cert.check_expiry_and_update_status()

        assert count == 0

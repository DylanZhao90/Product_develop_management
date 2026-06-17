from datetime import date, timedelta

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.certification import Certification
from app.repositories.certification_repo import CertificationRepository


class CertificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CertificationRepository(db)

    async def create_certification(self, data: dict, created_by: str) -> Certification:
        cert = Certification(
            product_id=data["product_id"],
            cert_type=data["cert_type"],
            cert_number=data.get("cert_number"),
            issued_by=data.get("issued_by"),
            issue_date=data.get("issue_date"),
            expiry_date=data.get("expiry_date"),
            cert_file_url=data.get("cert_file_url"),
            remind_before_days=data.get("remind_before_days", 90),
        )
        cert = await self.repo.create(cert)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="certification.create",
            resource_type="certification",
            resource_id=str(cert.id),
            new_value={"cert_type": cert.cert_type, "product_id": str(cert.product_id)},
        )
        await self.db.commit()
        return cert

    async def get_certifications(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        product_id: str | None = None,
        cert_type: str | None = None,
        status: str | None = None,
    ):
        return await self.repo.get_all(
            skip=skip, limit=limit, product_id=product_id, cert_type=cert_type, status=status
        )

    async def get_certification(self, cert_id: str) -> Certification | None:
        return await self.repo.get_by_id(cert_id)

    async def update_certification(self, cert_id: str, data: dict, updated_by: str | None = None) -> Certification:
        cert = await self.repo.get_by_id(cert_id)
        if not cert:
            raise NotFoundError("Certification not found")
        old_values = {"cert_type": cert.cert_type, "status": cert.status}
        update_entity_attrs(cert, data)
        cert = await self.repo.update(cert)
        await AuditLogger.log(self.db, user_id=updated_by, action="certification.update", resource_type="certification", resource_id=str(cert.id), old_value=old_values, new_value={"cert_type": cert.cert_type, "status": cert.status})
        await self.db.commit()
        return cert

    async def get_expiring(self, *, days: int = 90):
        return await self.repo.get_expiring(days=days)

    async def check_expiry_and_update_status(self) -> int:
        """Update status of expired/expiring certs using bulk UPDATE.

        Uses two SQL UPDATE statements (expired + expiring_soon), avoiding
        the N+1 pattern of loading all certs and updating one by one.
        Returns total count of changed rows.
        """
        today = date.today()
        count = 0

        # Bulk update: mark truly expired certs
        result = await self.db.execute(
            update(Certification)
            .where(
                Certification.expiry_date.isnot(None),
                Certification.expiry_date <= today,
                Certification.status != "expired",
            )
            .values(status="expired")
        )
        count += result.rowcount  # type: ignore[attr-defined]

        # Bulk update: mark certs expiring soon
        remind_threshold = today + timedelta(days=90)
        result = await self.db.execute(
            update(Certification)
            .where(
                Certification.expiry_date.isnot(None),
                Certification.expiry_date > today,
                Certification.expiry_date <= remind_threshold,
                Certification.status != "expiring_soon",
            )
            .values(status="expiring_soon")
        )
        count += result.rowcount  # type: ignore[attr-defined]

        return count

    async def delete_certification(self, cert_id: str, deleted_by: str | None = None) -> None:
        cert = await self.repo.get_by_id(cert_id)
        if not cert:
            raise NotFoundError("Certification not found")
        await self.db.delete(cert)
        await AuditLogger.log(self.db, user_id=deleted_by, action="certification.delete", resource_type="certification", resource_id=cert_id)
        await self.db.commit()

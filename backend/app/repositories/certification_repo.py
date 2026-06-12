from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certification import Certification
from app.repositories.base import BaseRepository


class CertificationRepository(BaseRepository[Certification]):
    model_class = Certification

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        product_id: str | None = None,
        cert_type: str | None = None,
        status: str | None = None,
    ) -> tuple[Sequence[Certification], int]:
        q = select(Certification)
        count_q = select(func.count(Certification.id))
        if product_id:
            q = q.where(Certification.product_id == product_id)
            count_q = count_q.where(Certification.product_id == product_id)
        if cert_type:
            q = q.where(Certification.cert_type == cert_type)
            count_q = count_q.where(Certification.cert_type == cert_type)
        if status:
            q = q.where(Certification.status == status)
            count_q = count_q.where(Certification.status == status)

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(Certification.expiry_date.asc().nulls_last()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def get_expiring(self, *, days: int = 90) -> Sequence[Certification]:
        from datetime import date, timedelta

        cutoff = date.today() + timedelta(days=days)
        result = await self.db.execute(
            select(Certification)
            .where(
                Certification.status == "valid",
                Certification.expiry_date <= cutoff,
                Certification.expiry_date > date.today(),
            )
            .order_by(Certification.expiry_date.asc())
        )
        return result.scalars().all()

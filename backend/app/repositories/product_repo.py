import uuid
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import LifecycleChangeLog, Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    model_class = Product

    async def get_by_code(self, code: str) -> Product | None:
        result = await self.db.execute(select(Product).where(Product.code == code))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        status: str | None = None,
        product_type: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[Product], int]:
        q = select(Product)
        count_q = select(func.count(Product.id))

        if status:
            q = q.where(Product.lifecycle_status == status)
            count_q = count_q.where(Product.lifecycle_status == status)
        if product_type:
            q = q.where(Product.type == product_type)
            count_q = count_q.where(Product.type == product_type)
        if search:
            q = q.where(
                Product.name.ilike(f"%{search}%") | Product.model.ilike(f"%{search}%")
            )
            count_q = count_q.where(
                Product.name.ilike(f"%{search}%") | Product.model.ilike(f"%{search}%")
            )

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(Product.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def generate_code(self, product_type: str | None = None) -> str:
        """Generate unique product code like AC-2026-0001. Retries once on collision."""
        prefix = "PD"
        if product_type == "ac_charger":
            prefix = "AC"
        elif product_type == "dc_charger":
            prefix = "DC"
        elif product_type == "portable":
            prefix = "PT"
        year = "2026"

        for _ in range(2):
            result = await self.db.execute(
                select(func.count(Product.id)).where(Product.code.like(f"{prefix}-{year}-%"))
            )
            count = result.scalar() or 0
            code = f"{prefix}-{year}-{count + 1:04d}"
            # Check uniqueness — avoid race condition
            existing = await self.db.execute(select(Product.id).where(Product.code == code))
            if not existing.scalar_one_or_none():
                return code
        # Fallback with UUID suffix on double collision (extremely unlikely)
        import uuid
        return f"{prefix}-{year}-{uuid.uuid4().hex[:4].upper()}"


class LifecycleChangeLogRepository(BaseRepository[LifecycleChangeLog]):
    model_class = LifecycleChangeLog

    async def get_by_product(self, product_id: str) -> Sequence[LifecycleChangeLog]:
        result = await self.db.execute(
            select(LifecycleChangeLog)
            .where(LifecycleChangeLog.product_id == product_id)
            .order_by(LifecycleChangeLog.changed_at.desc())
        )
        return result.scalars().all()

from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import OutsourceTask, Supplier
from app.repositories.base import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    model_class = Supplier

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        supplier_type: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[Supplier], int]:
        q = select(Supplier)
        count_q = select(func.count(Supplier.id))
        if supplier_type:
            q = q.where(Supplier.type == supplier_type)
            count_q = count_q.where(Supplier.type == supplier_type)
        if status:
            q = q.where(Supplier.status == status)
            count_q = count_q.where(Supplier.status == status)
        if search:
            q = q.where(Supplier.name.ilike(f"%{search}%"))
            count_q = count_q.where(Supplier.name.ilike(f"%{search}%"))

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(Supplier.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total


class OutsourceTaskRepository(BaseRepository[OutsourceTask]):
    model_class = OutsourceTask

    async def get_by_supplier(self, supplier_id: str) -> Sequence[OutsourceTask]:
        result = await self.db.execute(
            select(OutsourceTask)
            .where(OutsourceTask.supplier_id == supplier_id)
            .order_by(OutsourceTask.created_at.desc())
        )
        return result.scalars().all()

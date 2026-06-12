from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.design import DesignFile
from app.repositories.base import BaseRepository


class DesignFileRepository(BaseRepository[DesignFile]):
    model_class = DesignFile

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        product_id: str | None = None,
        file_type: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[DesignFile], int]:
        q = select(DesignFile)
        count_q = select(func.count(DesignFile.id))
        if product_id:
            q = q.where(DesignFile.product_id == product_id)
            count_q = count_q.where(DesignFile.product_id == product_id)
        if file_type:
            q = q.where(DesignFile.file_type == file_type)
            count_q = count_q.where(DesignFile.file_type == file_type)
        if search:
            q = q.where(DesignFile.file_name.ilike(f"%{search}%"))
            count_q = count_q.where(DesignFile.file_name.ilike(f"%{search}%"))

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(DesignFile.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def get_versions(self, file_id: str) -> Sequence[DesignFile]:
        """Return all versions of a design file (same file_name for a product)."""
        file = await self.get_by_id(file_id)
        if not file:
            return []
        result = await self.db.execute(
            select(DesignFile)
            .where(
                DesignFile.product_id == file.product_id,
                DesignFile.file_name == file.file_name,
            )
            .order_by(DesignFile.version.desc())
        )
        return result.scalars().all()

    async def get_latest_version(self, product_id: str, file_name: str) -> int:
        result = await self.db.execute(
            select(func.max(DesignFile.version)).where(
                DesignFile.product_id == product_id,
                DesignFile.file_name == file_name,
            )
        )
        return (result.scalar() or 0) + 1

    async def mark_previous_versions_not_current(self, product_id: str, file_name: str) -> None:
        """Set is_current=False for all existing versions of this file."""
        from sqlalchemy import update
        await self.db.execute(
            update(DesignFile)
            .where(
                DesignFile.product_id == product_id,
                DesignFile.file_name == file_name,
                DesignFile.is_current == True,
            )
            .values(is_current=False)
        )

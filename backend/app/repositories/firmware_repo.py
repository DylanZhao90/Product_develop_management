from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.firmware import FirmwareUpgradeTask, FirmwareVersion
from app.repositories.base import BaseRepository


class FirmwareVersionRepository(BaseRepository[FirmwareVersion]):
    model_class = FirmwareVersion

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        product_model: str | None = None,
    ) -> tuple[Sequence[FirmwareVersion], int]:
        q = select(FirmwareVersion)
        count_q = select(func.count(FirmwareVersion.id))
        if product_model:
            q = q.where(FirmwareVersion.product_model == product_model)
            count_q = count_q.where(FirmwareVersion.product_model == product_model)

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(FirmwareVersion.released_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total


class FirmwareUpgradeTaskRepository(BaseRepository[FirmwareUpgradeTask]):
    model_class = FirmwareUpgradeTask

    async def get_by_firmware_version(self, firmware_version_id: str) -> list[FirmwareUpgradeTask]:
        result = await self.db.execute(
            select(FirmwareUpgradeTask).where(FirmwareUpgradeTask.firmware_version_id == firmware_version_id)
        )
        return list(result.scalars().all())

    async def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        firmware_version_id: str | None = None,
        status: str | None = None,
    ) -> tuple[Sequence[FirmwareUpgradeTask], int]:
        q = select(FirmwareUpgradeTask)
        count_q = select(func.count(FirmwareUpgradeTask.id))
        if firmware_version_id:
            q = q.where(FirmwareUpgradeTask.firmware_version_id == firmware_version_id)
            count_q = count_q.where(FirmwareUpgradeTask.firmware_version_id == firmware_version_id)
        if status:
            q = q.where(FirmwareUpgradeTask.status == status)
            count_q = count_q.where(FirmwareUpgradeTask.status == status)

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(FirmwareUpgradeTask.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

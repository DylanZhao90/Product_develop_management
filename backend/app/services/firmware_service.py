import hashlib

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.minio_client import get_file_url, upload_file
from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.firmware import FirmwareUpgradeTask, FirmwareVersion
from app.repositories.firmware_repo import FirmwareUpgradeTaskRepository, FirmwareVersionRepository

MAX_FIRMWARE_SIZE = 50 * 1024 * 1024  # 50 MB


class FirmwareService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.version_repo = FirmwareVersionRepository(db)
        self.task_repo = FirmwareUpgradeTaskRepository(db)

    # ---- Versions ----

    async def create_version(self, data: dict, created_by: str) -> FirmwareVersion:
        fw = FirmwareVersion(
            product_model=data["product_model"],
            version=data["version"],
            file_url=data["file_url"],
            file_size=data.get("file_size"),
            file_hash=data.get("file_hash"),
            release_notes=data.get("release_notes"),
            release_type=data.get("release_type", "full"),
            released_by=created_by,
        )
        fw = await self.version_repo.create(fw)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="firmware_version.create",
            resource_type="firmware_version",
            resource_id=str(fw.id),
            new_value={"product_model": fw.product_model, "version": fw.version},
        )
        await self.db.commit()
        return fw

    async def upload_firmware(
        self, file: UploadFile, product_model: str, version: str, release_notes: str,
        release_type: str, created_by: str,
    ) -> FirmwareVersion:
        if file.size and file.size > MAX_FIRMWARE_SIZE:
            raise ValueError(
                f"Firmware file too large: {file.size} bytes exceeds limit of {MAX_FIRMWARE_SIZE} bytes"
            )

        content = await file.read()
        if len(content) > MAX_FIRMWARE_SIZE:
            raise ValueError(
                f"Firmware file too large: {len(content)} bytes exceeds limit of {MAX_FIRMWARE_SIZE} bytes"
            )

        file_hash = hashlib.sha256(content).hexdigest()
        object_key = f"firmware/{product_model}/{version}/{file.filename}"

        try:
            await upload_file(object_key, content, "application/octet-stream")
        except Exception:
            await self.db.rollback()
            raise

        fw = FirmwareVersion(
            product_model=product_model,
            version=version,
            file_url=object_key,
            file_size=len(content),
            file_hash=file_hash,
            release_notes=release_notes,
            release_type=release_type,
            released_by=created_by,
        )
        fw = await self.version_repo.create(fw)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="firmware_version.upload",
            resource_type="firmware_version",
            resource_id=str(fw.id),
            new_value={"product_model": fw.product_model, "version": fw.version},
        )
        await self.db.commit()
        return fw

    async def get_versions(
        self, *, skip: int = 0, limit: int = 20, product_model: str | None = None,
    ):
        return await self.version_repo.get_all(skip=skip, limit=limit, product_model=product_model)

    async def get_version(self, version_id: str) -> FirmwareVersion | None:
        fw = await self.version_repo.get_by_id(version_id)
        if fw:
            fw._download_url = await get_file_url(fw.file_url)
        return fw

    # ---- Upgrade Tasks ----

    async def create_upgrade_task(self, data: dict, created_by: str) -> FirmwareUpgradeTask:
        task = FirmwareUpgradeTask(
            firmware_version_id=data["firmware_version_id"],
            target_sn_filter=data.get("target_sn_filter"),
            gray_scale_percent=data.get("gray_scale_percent", 100),
            created_by=created_by,
        )
        task = await self.task_repo.create(task)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="firmware_upgrade_task.create",
            resource_type="firmware_upgrade_task",
            resource_id=str(task.id),
        )
        await self.db.commit()
        return task

    async def get_upgrade_tasks(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        firmware_version_id: str | None = None,
        status: str | None = None,
    ):
        return await self.task_repo.get_all(
            skip=skip, limit=limit, firmware_version_id=firmware_version_id, status=status,
        )

    async def get_upgrade_task(self, task_id: str) -> FirmwareUpgradeTask | None:
        return await self.task_repo.get_by_id(task_id)

    async def update_upgrade_task(self, task_id: str, data: dict, updated_by: str | None = None) -> FirmwareUpgradeTask:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Upgrade task not found")
        old_values = {"status": task.status, "gray_scale_percent": task.gray_scale_percent}
        update_entity_attrs(task, data)
        task = await self.task_repo.update(task)
        await AuditLogger.log(self.db, user_id=updated_by, action="firmware_upgrade_task.update", resource_type="firmware_upgrade_task", resource_id=str(task.id), old_value=old_values, new_value={"status": task.status, "gray_scale_percent": task.gray_scale_percent})
        await self.db.commit()
        return task

    async def cancel_upgrade_task(self, task_id: str, cancelled_by: str | None = None) -> FirmwareUpgradeTask:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Upgrade task not found")
        old_status = task.status
        task.status = "failed"
        task = await self.task_repo.update(task)
        await AuditLogger.log(self.db, user_id=cancelled_by, action="firmware_upgrade_task.cancel", resource_type="firmware_upgrade_task", resource_id=str(task.id), old_value={"status": old_status}, new_value={"status": "failed"})
        await self.db.commit()
        return task

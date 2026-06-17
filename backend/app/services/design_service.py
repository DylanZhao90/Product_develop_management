from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.minio_client import get_file_url, upload_file
from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.design import DesignFile
from app.repositories.design_repo import DesignFileRepository


class DesignService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DesignFileRepository(db)

    async def create_design_file(self, data: dict, created_by: str) -> DesignFile:
        version = await self.repo.get_latest_version(
            data["product_id"], data["file_name"]
        )
        # Mark all previous versions of the same file as not current
        await self.repo.mark_previous_versions_not_current(
            data["product_id"], data["file_name"]
        )
        design_file = DesignFile(
            product_id=data["product_id"],
            file_name=data["file_name"],
            file_type=data["file_type"],
            version=version,
            file_url=data["file_url"],
            file_size=data.get("file_size"),
            change_notes=data.get("change_notes"),
            uploaded_by=created_by,
            is_current=True,
        )
        design_file = await self.repo.create(design_file)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="design_file.create",
            resource_type="design_file",
            resource_id=str(design_file.id),
            new_value={"file_name": design_file.file_name, "version": version},
        )
        await self.db.commit()
        return design_file

    async def get_design_files(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        product_id: str | None = None,
        file_type: str | None = None,
        search: str | None = None,
    ):
        return await self.repo.get_all(
            skip=skip, limit=limit, product_id=product_id, file_type=file_type, search=search,
        )

    async def get_design_file(self, file_id: str) -> DesignFile | None:
        return await self.repo.get_by_id(file_id)

    async def get_design_file_with_url(self, file_id: str) -> DesignFile | None:
        design_file = await self.repo.get_by_id(file_id)
        if design_file:
            design_file._download_url = await get_file_url(design_file.file_url)
        return design_file

    async def get_versions(self, file_id: str):
        return await self.repo.get_versions(file_id)

    async def update_design_file(self, file_id: str, data: dict, updated_by: str | None = None) -> DesignFile:
        design_file = await self.repo.get_by_id(file_id)
        if not design_file:
            raise NotFoundError("Design file not found")
        old_values = {"file_name": design_file.file_name, "is_current": design_file.is_current}
        update_entity_attrs(design_file, data)
        design_file = await self.repo.update(design_file)
        await AuditLogger.log(self.db, user_id=updated_by, action="design_file.update", resource_type="design_file", resource_id=str(design_file.id), old_value=old_values, new_value={"file_name": design_file.file_name, "is_current": design_file.is_current})
        await self.db.commit()
        return design_file

    async def delete_design_file(self, file_id: str, deleted_by: str | None = None) -> None:
        design_file = await self.repo.get_by_id(file_id)
        if not design_file:
            raise NotFoundError("Design file not found")
        await self.db.delete(design_file)
        await AuditLogger.log(self.db, user_id=deleted_by, action="design_file.delete", resource_type="design_file", resource_id=file_id)
        await self.db.commit()

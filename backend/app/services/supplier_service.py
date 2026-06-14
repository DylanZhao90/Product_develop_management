from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.supplier import OutsourceTask, Supplier
from app.repositories.supplier_repo import OutsourceTaskRepository, SupplierRepository


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.supplier_repo = SupplierRepository(db)
        self.task_repo = OutsourceTaskRepository(db)

    # ---- Suppliers ----

    async def create_supplier(self, data: dict, created_by: str) -> Supplier:
        supplier = Supplier(
            name=data["name"],
            type=data["type"],
            contact_name=data.get("contact_name"),
            contact_email=data.get("contact_email"),
            contact_feishu_id=data.get("contact_feishu_id"),
            qualification_files=data.get("qualification_files", []),
            notes=data.get("notes"),
        )
        supplier = await self.supplier_repo.create(supplier)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="supplier.create",
            resource_type="supplier",
            resource_id=str(supplier.id),
            new_value={"name": supplier.name, "type": supplier.type},
        )
        await self.db.commit()
        return supplier

    async def get_suppliers(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        supplier_type: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ):
        return await self.supplier_repo.get_all(
            skip=skip, limit=limit, supplier_type=supplier_type, status=status, search=search,
        )

    async def get_supplier(self, supplier_id: str) -> Supplier | None:
        return await self.supplier_repo.get_by_id(supplier_id)

    async def update_supplier(self, supplier_id: str, data: dict, updated_by: str | None = None) -> Supplier:
        supplier = await self.supplier_repo.get_by_id(supplier_id)
        if not supplier:
            raise ValueError("Supplier not found")
        old_values = {"name": supplier.name, "status": supplier.status, "rating": float(supplier.rating) if supplier.rating is not None else None}
        update_entity_attrs(supplier, data)
        supplier = await self.supplier_repo.update(supplier)
        await AuditLogger.log(self.db, user_id=updated_by, action="supplier.update", resource_type="supplier", resource_id=str(supplier.id), old_value=old_values, new_value={"name": supplier.name, "status": supplier.status})
        await self.db.commit()
        return supplier

    # ---- Outsource Tasks ----

    async def create_outsource_task(self, data: dict, created_by: str) -> OutsourceTask:
        task = OutsourceTask(
            supplier_id=data["supplier_id"],
            project_task_id=data.get("project_task_id"),
            title=data["title"],
            rfq_url=data.get("rfq_url"),
            quotation_amount=data.get("quotation_amount"),
        )
        task = await self.task_repo.create(task)
        await AuditLogger.log(
            self.db,
            user_id=created_by,
            action="outsource_task.create",
            resource_type="outsource_task",
            resource_id=str(task.id),
            new_value={"title": task.title, "supplier_id": str(task.supplier_id)},
        )
        await self.db.commit()
        return task

    async def get_outsource_tasks(self, supplier_id: str):
        return await self.task_repo.get_by_supplier(supplier_id)

    async def get_outsource_task(self, task_id: str) -> OutsourceTask | None:
        return await self.task_repo.get_by_id(task_id)

    async def update_outsource_task(self, task_id: str, data: dict, updated_by: str | None = None) -> OutsourceTask:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Outsource task not found")
        old_values = {"title": task.title, "review_status": task.review_status}
        update_entity_attrs(task, data)
        task = await self.task_repo.update(task)
        await AuditLogger.log(self.db, user_id=updated_by, action="outsource_task.update", resource_type="outsource_task", resource_id=str(task.id), old_value=old_values, new_value={"title": task.title, "review_status": task.review_status})
        await self.db.commit()
        return task

    async def review_outsource_task(self, task_id: str, data: dict, reviewer_id: str) -> OutsourceTask:
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            raise ValueError("Outsource task not found")
        task.review_status = data["review_status"]
        task.review_comment = data.get("review_comment")
        await AuditLogger.log(
            self.db,
            user_id=reviewer_id,
            action="outsource_task.review",
            resource_type="outsource_task",
            resource_id=str(task.id),
            new_value={"review_status": task.review_status},
        )
        await self.db.commit()
        return await self.task_repo.update(task)

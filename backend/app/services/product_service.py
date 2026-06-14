from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus import Topics, event_bus
from app.core.exceptions import BadRequestError, NotFoundError
from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLogger
from app.models.product import LifecycleChangeLog, Product
from app.repositories.product_repo import LifecycleChangeLogRepository, ProductRepository


class ProductService:
    VALID_TRANSITIONS = {
        "in_development": ["trial_handover"],
        "trial_handover": ["in_development", "on_sale"],
        "on_sale": ["discontinued"],
        "discontinued": ["eol"],
        "eol": [],  # terminal state
    }

    def __init__(self, db: AsyncSession):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.lifecycle_log_repo = LifecycleChangeLogRepository(db)

    async def create_product(self, data: dict, created_by: str) -> Product:
        code = await self.product_repo.generate_code(data.get("type"))
        product = Product(
            code=code,
            model=data["model"],
            name=data["name"],
            type=data.get("type"),
            target_markets=data.get("target_markets", []),
            certification_requirements=data.get("certification_requirements", []),
            description=data.get("description"),
            product_manager_id=created_by,
            lifecycle_status="in_development",
        )
        product = await self.product_repo.create(product)
        await AuditLogger.log(self.db, user_id=created_by, action="product.create", resource_type="product", resource_id=str(product.id), new_value={"name": product.name, "model": product.model})
        await self.db.commit()
        return product

    async def get_products(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        status: str | None = None,
        product_type: str | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[Product], int]:
        return await self.product_repo.get_all(
            skip=skip, limit=limit, status=status, product_type=product_type, search=search
        )

    async def get_product(self, product_id: str) -> Product | None:
        return await self.product_repo.get_by_id(product_id)

    async def update_product(self, product_id: str, data: dict, updated_by: str | None = None) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundError("Product not found")
        old_values = {"name": product.name, "model": product.model, "lifecycle_status": product.lifecycle_status}
        update_entity_attrs(product, data)
        product = await self.product_repo.update(product)
        await AuditLogger.log(self.db, user_id=updated_by, action="product.update", resource_type="product", resource_id=str(product.id), old_value=old_values, new_value={"name": product.name, "model": product.model})
        await self.db.commit()
        return product

    async def transition_lifecycle(self, product_id: str, to_status: str, changed_by: str, reason: str | None = None) -> tuple[Product, LifecycleChangeLog]:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundError("Product not found")

        valid_next = self.VALID_TRANSITIONS.get(product.lifecycle_status, [])
        if to_status not in valid_next:
            raise BadRequestError(
                f"Invalid transition: {product.lifecycle_status} -> {to_status}. "
                f"Allowed: {valid_next}"
            )

        old_status = product.lifecycle_status
        product.lifecycle_status = to_status
        await self.product_repo.update(product)

        log = LifecycleChangeLog(
            product_id=product.id,
            from_status=old_status,
            to_status=to_status,
            changed_by=changed_by,
            reason=reason,
        )
        await self.lifecycle_log_repo.create(log)
        await AuditLogger.log(self.db, user_id=changed_by, action="lifecycle.transition", resource_type="product", resource_id=str(product.id), old_value={"status": old_status}, new_value={"status": to_status})
        if to_status == "discontinued":
            await event_bus.publish(Topics.PRODUCT_DISCONTINUED, {"product_id": str(product.id), "product_name": product.name})
        await self.db.commit()
        return product, log

    async def get_lifecycle_logs(self, product_id: str) -> Sequence[LifecycleChangeLog]:
        return await self.lifecycle_log_repo.get_by_product(product_id)

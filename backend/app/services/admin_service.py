from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import update_entity_attrs
from app.middleware.audit import AuditLog, AuditLogger
from app.models.user import User
from app.repositories.user_repo import UserRepository


class AdminService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    # ---- User Management ----

    async def list_users(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
    ):
        return await self.user_repo.search_users(skip=skip, limit=limit, search=search)

    async def create_user(self, data: dict, created_by: str | None = None) -> User:
        user = User(
            name=data["name"],
            email=data.get("email"),
            role=data.get("role", "engineer"),
            feishu_open_id=data.get("feishu_open_id"),
            feishu_union_id=data.get("feishu_union_id"),
        )
        self.db.add(user)
        await self.db.flush()
        await AuditLogger.log(self.db, user_id=created_by, action="user.create", resource_type="user", resource_id=str(user.id), new_value={"name": user.name, "role": user.role})
        await self.db.commit()
        return user

    async def update_user(self, user_id: str, data: dict, updated_by: str | None = None) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        old_values = {"name": user.name, "role": user.role, "is_active": user.is_active}
        update_entity_attrs(user, data)
        await self.db.flush()
        await AuditLogger.log(self.db, user_id=updated_by, action="user.update", resource_type="user", resource_id=str(user.id), old_value=old_values, new_value={"name": user.name, "role": user.role, "is_active": user.is_active})
        await self.db.commit()
        return user

    # ---- Audit Logs ----

    async def get_audit_logs(
        self,
        *,
        skip: int = 0,
        limit: int = 20,
        resource_type: str | None = None,
        user_id: str | None = None,
    ):
        q = select(AuditLog)
        count_q = select(func.count(AuditLog.id))
        if resource_type:
            q = q.where(AuditLog.resource_type == resource_type)
            count_q = count_q.where(AuditLog.resource_type == resource_type)
        if user_id:
            q = q.where(AuditLog.user_id == user_id)
            count_q = count_q.where(AuditLog.user_id == user_id)

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

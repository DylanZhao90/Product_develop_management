from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model_class = User

    async def get_by_feishu_open_id(self, open_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.feishu_open_id == open_id))
        return result.scalar_one_or_none()

    async def get_all(self, *, skip: int = 0, limit: int = 20) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.is_active == True).offset(skip).limit(limit).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def search_users(
        self, *, skip: int = 0, limit: int = 20, search: str | None = None
    ) -> tuple[list[User], int]:
        """Search users by name or email with pagination."""
        q = select(User)
        count_q = select(func.count(User.id))
        if search:
            like_pattern = f"%{search}%"
            q = q.where(User.name.ilike(like_pattern) | User.email.ilike(like_pattern))
            count_q = count_q.where(User.name.ilike(like_pattern) | User.email.ilike(like_pattern))

        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(
            q.order_by(User.created_at.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all()), total

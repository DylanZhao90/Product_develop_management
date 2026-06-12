"""Base repository with generic CRUD operations."""

from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Generic base repository providing common get_by_id, create, and update methods.

    Subclasses must set the ``model_class`` attribute to the specific SQLAlchemy
    model they manage, or override methods for custom behaviour.
    """

    model_class: type[ModelT]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: Any) -> ModelT | None:
        """Fetch a single record by primary key."""
        result = await self.db.execute(
            select(self.model_class).where(self.model_class.id == id)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none()

    async def create(self, entity: ModelT) -> ModelT:
        """Add and flush a new entity to the session."""
        self.db.add(entity)
        await self.db.flush()
        return entity

    async def update(self, entity: ModelT) -> ModelT:
        """Flush changes to an existing tracked entity."""
        await self.db.flush()
        return entity

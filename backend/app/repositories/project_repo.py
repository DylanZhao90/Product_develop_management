from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectTask, TechnicalIssue
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model_class = Project

    async def get_all(
        self, *, skip: int = 0, limit: int = 20, product_id: str | None = None, status: str | None = None
    ) -> tuple[Sequence[Project], int]:
        q = select(Project)
        count_q = select(func.count(Project.id))
        if product_id:
            q = q.where(Project.product_id == product_id)
            count_q = count_q.where(Project.product_id == product_id)
        if status:
            q = q.where(Project.status == status)
            count_q = count_q.where(Project.status == status)
        total = (await self.db.execute(count_q)).scalar() or 0
        result = await self.db.execute(q.order_by(Project.created_at.desc()).offset(skip).limit(limit))
        return result.scalars().all(), total


class ProjectTaskRepository(BaseRepository[ProjectTask]):
    model_class = ProjectTask

    async def get_by_project(self, project_id: str) -> Sequence[ProjectTask]:
        result = await self.db.execute(
            select(ProjectTask)
            .where(ProjectTask.project_id == project_id)
            .order_by(ProjectTask.sort_order)
        )
        return result.scalars().all()


class TechnicalIssueRepository(BaseRepository[TechnicalIssue]):
    model_class = TechnicalIssue

    async def get_by_project(self, project_id: str) -> Sequence[TechnicalIssue]:
        result = await self.db.execute(
            select(TechnicalIssue)
            .where(TechnicalIssue.project_id == project_id)
            .order_by(TechnicalIssue.created_at.desc())
        )
        return result.scalars().all()

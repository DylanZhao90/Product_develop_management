from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.project import Project, ProjectTask, TechnicalIssue
from app.models.supplier import Supplier


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self) -> dict:
        active_statuses = ["in_development", "trial_handover", "on_sale"]

        product_total = await self.db.scalar(
            select(func.count(Product.id)).where(Product.lifecycle_status.in_(active_statuses))
        ) or 0

        project_active = await self.db.scalar(
            select(func.count(Project.id)).where(
                Project.status.in_(["approved", "in_progress"])
            )
        ) or 0

        pending_tasks = await self.db.scalar(
            select(func.count(ProjectTask.id)).where(
                ProjectTask.status.in_(["pending", "in_progress"])
            )
        ) or 0

        task_completed = await self.db.scalar(
            select(func.count(ProjectTask.id)).where(ProjectTask.status == "completed")
        ) or 0

        recent_projects = await self._get_recent_projects()
        recent_tasks = await self._get_recent_tasks()

        return {
            "active_products": product_total,
            "active_projects": project_active,
            "pending_tasks": pending_tasks,
            "completed_tasks": task_completed,
            "recent_projects": recent_projects,
            "recent_tasks": recent_tasks,
        }

    async def _get_recent_projects(self) -> list[dict]:
        result = await self.db.execute(
            select(Project.id, Project.name, Project.status, Project.created_at)
            .order_by(Project.created_at.desc())
            .limit(5)
        )
        return [
            {"id": r[0], "name": r[1], "status": r[2], "created_at": str(r[3]) if r[3] else None}
            for r in result.all()
        ]

    async def _get_recent_tasks(self) -> list[dict]:
        result = await self.db.execute(
            select(ProjectTask.id, ProjectTask.name, ProjectTask.status, ProjectTask.created_at)
            .order_by(ProjectTask.created_at.desc())
            .limit(5)
        )
        return [
            {
                "id": str(r[0]),
                "name": r[1],
                "status": r[2],
                "created_at": str(r[3]) if r[3] else None,
            }
            for r in result.all()
        ]

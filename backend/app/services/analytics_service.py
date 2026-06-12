from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.project import Project, ProjectTask, TechnicalIssue


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_overview(self) -> dict:
        """Get product lifecycle and project status distributions."""
        prod_result = await self.db.execute(
            select(Product.lifecycle_status, func.count(Product.id)).group_by(
                Product.lifecycle_status
            )
        )
        product_stats = {r[0]: r[1] for r in prod_result.all()}

        proj_result = await self.db.execute(
            select(Project.status, func.count(Project.id)).group_by(Project.status)
        )
        project_stats = {r[0]: r[1] for r in proj_result.all()}

        return {"products_by_status": product_stats, "projects_by_status": project_stats}

    async def get_trends(self) -> list[dict]:
        """Product creation trend over last 90 days."""
        result = await self.db.execute(
            select(
                func.date(Product.created_at).label("dt"),
                func.count(Product.id),
            )
            .group_by(func.date(Product.created_at))
            .order_by(func.date(Product.created_at).asc())
            .limit(90)
        )
        return [{"date": str(r[0]), "count": r[1]} for r in result.all()]

    async def get_task_stats(self) -> dict:
        """Task completion statistics."""
        total = await self.db.scalar(select(func.count(ProjectTask.id))) or 0
        completed = await self.db.scalar(
            select(func.count(ProjectTask.id)).where(ProjectTask.status == "completed")
        ) or 0
        blocked = await self.db.scalar(
            select(func.count(ProjectTask.id)).where(ProjectTask.status == "blocked")
        ) or 0
        return {"total": total, "completed": completed, "blocked": blocked, "pending": total - completed - blocked}

    async def get_issue_distribution(self) -> list[dict]:
        """Issue severity distribution."""
        result = await self.db.execute(
            select(TechnicalIssue.severity, func.count(TechnicalIssue.id)).group_by(
                TechnicalIssue.severity
            )
        )
        return [{"severity": r[0] or "unknown", "count": r[1]} for r in result.all()]

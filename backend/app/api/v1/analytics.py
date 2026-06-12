"""Quality analytics — product & project metrics."""

from fastapi import APIRouter, Query

from app.core.deps import CurrentUserDep, DBSessionDep
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
async def analytics_overview(db: DBSessionDep, current_user: CurrentUserDep):
    service = AnalyticsService(db)
    data = await service.get_overview()
    return {"success": True, "data": data}


@router.get("/trends")
async def trend_data(db: DBSessionDep, current_user: CurrentUserDep):
    service = AnalyticsService(db)
    data = await service.get_trends()
    return {"success": True, "data": data}


@router.get("/task-stats")
async def task_stats(db: DBSessionDep, current_user: CurrentUserDep):
    service = AnalyticsService(db)
    data = await service.get_task_stats()
    return {"success": True, "data": data}


@router.get("/issue-distribution")
async def issue_distribution(db: DBSessionDep, current_user: CurrentUserDep):
    service = AnalyticsService(db)
    data = await service.get_issue_distribution()
    return {"success": True, "data": data}

"""Dashboard statistics API routes."""

from fastapi import APIRouter

from app.core.deps import CurrentUserDep, DBSessionDep
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: DBSessionDep, current_user: CurrentUserDep):
    service = DashboardService(db)
    data = await service.get_stats()
    return {"success": True, "data": data}

"""System administration — user management, roles, audit logs."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import AdminUserDep, DBSessionDep
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    db: DBSessionDep,
    current_user: AdminUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
):
    service = AdminService(db)
    skip = (page - 1) * page_size
    users, total = await service.list_users(skip=skip, limit=page_size, search=search)
    return {
        "success": True,
        "data": [UserResponse.model_validate(u) for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate, db: DBSessionDep, current_user: AdminUserDep,
):
    service = AdminService(db)
    user = await service.create_user(body.model_dump())
    return {"success": True, "data": UserResponse.model_validate(user)}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str, body: UserUpdate, db: DBSessionDep, current_user: AdminUserDep,
):
    service = AdminService(db)
    user = await service.update_user(user_id, body.model_dump(exclude_none=True))
    return {"success": True, "data": UserResponse.model_validate(user)}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: DBSessionDep, current_user: AdminUserDep):
    service = AdminService(db)
    await service.delete_user(user_id, str(current_user.id))
    return {"success": True, "message": "用户已删除"}


@router.get("/audit-logs")
async def get_audit_logs(
    db: DBSessionDep,
    current_user: AdminUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    resource_type: str | None = None,
    user_id: str | None = None,
):
    service = AdminService(db)
    skip = (page - 1) * page_size
    logs, total = await service.get_audit_logs(
        skip=skip, limit=page_size, resource_type=resource_type, user_id=user_id,
    )
    return {
        "success": True,
        "data": [serialize_audit_log(l) for l in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def serialize_audit_log(l) -> dict:
    return {
        "id": str(l.id),
        "user_id": str(l.user_id) if l.user_id else None,
        "action": l.action,
        "resource_type": l.resource_type,
        "resource_id": l.resource_id,
        "old_value": l.old_value,
        "new_value": l.new_value,
        "ip_address": l.ip_address,
        "user_agent": l.user_agent,
        "created_at": l.created_at if l.created_at else None,
    }

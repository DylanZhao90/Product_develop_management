"""Firmware version management and OTA upgrade tasks."""

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.schemas.firmware import (
    FirmwareUpgradeTaskCreate,
    FirmwareUpgradeTaskResponse,
    FirmwareUpgradeTaskUpdate,
    FirmwareVersionCreate,
    FirmwareVersionResponse,
)
from app.services.firmware_service import FirmwareService

router = APIRouter(prefix="/firmware", tags=["firmware"])

# ---- Firmware Versions ----


@router.get("/versions")
async def list_versions(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    product_model: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = FirmwareService(db)
    skip = (page - 1) * page_size
    versions, total = await service.get_versions(
        skip=skip, limit=page_size, product_model=product_model,
    )
    return {
        "success": True,
        "data": [FirmwareVersionResponse.model_validate(v) for v in versions],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/versions", status_code=status.HTTP_201_CREATED)
async def create_version(
    body: FirmwareVersionCreate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = FirmwareService(db)
    fw = await service.create_version(body.model_dump(), str(current_user.id))
    return {"success": True, "data": FirmwareVersionResponse.model_validate(fw)}


@router.post("/versions/upload", status_code=status.HTTP_201_CREATED)
async def upload_firmware(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
    product_model: str = Form(...),
    version: str = Form(...),
    release_notes: str = Form(""),
    release_type: str = Form("full"),
):
    service = FirmwareService(db)
    fw = await service.upload_firmware(
        file, product_model, version, release_notes, release_type, str(current_user.id),
    )
    return {"success": True, "data": FirmwareVersionResponse.model_validate(fw)}


@router.get("/versions/{version_id}")
async def get_version(version_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = FirmwareService(db)
    fw = await service.get_version(version_id)
    if not fw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    data = FirmwareVersionResponse.model_validate(fw).model_dump()
    data["download_url"] = getattr(fw, "_download_url", None)
    return {"success": True, "data": data}


@router.delete("/versions/{version_id}")
async def delete_version(version_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = FirmwareService(db)
    await service.delete_version(version_id, str(current_user.id))
    return {"success": True, "message": "固件版本已删除"}


# ---- OTA Upgrade Tasks ----


@router.get("/upgrade-tasks")
async def list_upgrade_tasks(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    firmware_version_id: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = FirmwareService(db)
    skip = (page - 1) * page_size
    tasks, total = await service.get_upgrade_tasks(
        skip=skip, limit=page_size, firmware_version_id=firmware_version_id, status=status,
    )
    return {
        "success": True,
        "data": [FirmwareUpgradeTaskResponse.model_validate(t) for t in tasks],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/upgrade-tasks", status_code=status.HTTP_201_CREATED)
async def create_upgrade_task(
    body: FirmwareUpgradeTaskCreate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = FirmwareService(db)
    task = await service.create_upgrade_task(body.model_dump(), str(current_user.id))
    return {"success": True, "data": FirmwareUpgradeTaskResponse.model_validate(task)}


@router.get("/upgrade-tasks/{task_id}")
async def get_upgrade_task(task_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = FirmwareService(db)
    task = await service.get_upgrade_task(task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return {"success": True, "data": FirmwareUpgradeTaskResponse.model_validate(task)}


@router.patch("/upgrade-tasks/{task_id}")
async def update_upgrade_task(
    task_id: str, body: FirmwareUpgradeTaskUpdate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = FirmwareService(db)
    task = await service.update_upgrade_task(task_id, body.model_dump(exclude_none=True), str(current_user.id))
    return {"success": True, "data": FirmwareUpgradeTaskResponse.model_validate(task)}


@router.delete("/upgrade-tasks/{task_id}")
async def delete_upgrade_task(task_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = FirmwareService(db)
    await service.delete_upgrade_task(task_id, str(current_user.id))
    return {"success": True, "message": "升级任务已删除"}


@router.post("/upgrade-tasks/{task_id}/cancel")
async def cancel_upgrade_task(task_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = FirmwareService(db)
    task = await service.cancel_upgrade_task(task_id, str(current_user.id))
    return {"success": True, "data": FirmwareUpgradeTaskResponse.model_validate(task)}

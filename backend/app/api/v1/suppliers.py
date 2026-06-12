"""Supplier management and outsource task dispatch."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.schemas.supplier import (
    OutsourceTaskCreate,
    OutsourceTaskResponse,
    OutsourceTaskReview,
    OutsourceTaskUpdate,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

# ---- Suppliers ----


@router.get("")
async def list_suppliers(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    search: str | None = None,
    type: str | None = None,
):
    service = SupplierService(db)
    skip = (page - 1) * page_size
    suppliers, total = await service.get_suppliers(
        skip=skip, limit=page_size, supplier_type=type, status=status, search=search,
    )
    return {
        "success": True,
        "data": [SupplierResponse.model_validate(s) for s in suppliers],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: SupplierCreate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = SupplierService(db)
    supplier = await service.create_supplier(body.model_dump(), str(current_user.id))
    return {"success": True, "data": SupplierResponse.model_validate(supplier)}


@router.get("/{supplier_id}")
async def get_supplier(supplier_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = SupplierService(db)
    s = await service.get_supplier(supplier_id)
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return {"success": True, "data": SupplierResponse.model_validate(s)}


@router.patch("/{supplier_id}")
async def update_supplier(
    supplier_id: str, body: SupplierUpdate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = SupplierService(db)
    try:
        s = await service.update_supplier(supplier_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": SupplierResponse.model_validate(s)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ---- Outsource Tasks ----


@router.get("/{supplier_id}/outsource-tasks")
async def list_outsource_tasks(supplier_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = SupplierService(db)
    tasks = await service.get_outsource_tasks(supplier_id)
    return {"success": True, "data": [OutsourceTaskResponse.model_validate(t) for t in tasks]}


@router.post("/{supplier_id}/outsource-tasks", status_code=status.HTTP_201_CREATED)
async def create_outsource_task(
    supplier_id: str, body: OutsourceTaskCreate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = SupplierService(db)
    if not await service.get_supplier(supplier_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    data = body.model_dump()
    data["supplier_id"] = supplier_id
    task = await service.create_outsource_task(data, str(current_user.id))
    return {"success": True, "data": OutsourceTaskResponse.model_validate(task)}


@router.patch("/{supplier_id}/outsource-tasks/{task_id}")
async def update_outsource_task(
    supplier_id: str, task_id: str, body: OutsourceTaskUpdate,
    db: DBSessionDep, current_user: CurrentUserDep,
):
    service = SupplierService(db)
    try:
        task = await service.update_outsource_task(task_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": OutsourceTaskResponse.model_validate(task)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{supplier_id}/outsource-tasks/{task_id}/review")
async def review_outsource_task(
    supplier_id: str, task_id: str, body: OutsourceTaskReview,
    db: DBSessionDep, current_user: CurrentUserDep,
):
    service = SupplierService(db)
    try:
        task = await service.review_outsource_task(task_id, body.model_dump(), str(current_user.id))
        return {"success": True, "data": OutsourceTaskResponse.model_validate(task)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

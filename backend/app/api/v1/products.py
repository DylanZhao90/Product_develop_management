from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.schemas.product import (
    LifecycleChangeLogResponse,
    LifecycleTransitionRequest,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
async def list_products(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    type: str | None = None,
    search: str | None = None,
):
    service = ProductService(db)
    skip = (page - 1) * page_size
    products, total = await service.get_products(
        skip=skip, limit=page_size, status=status, product_type=type, search=search
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "success": True,
        "data": [ProductResponse.model_validate(p) for p in products],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
):
    service = ProductService(db)
    product = await service.create_product(body.model_dump(), str(current_user.id))
    return {"success": True, "data": ProductResponse.model_validate(product)}


@router.get("/{product_id}")
async def get_product(product_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProductService(db)
    product = await service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return {"success": True, "data": ProductResponse.model_validate(product)}


@router.patch("/{product_id}")
async def update_product(
    product_id: str,
    body: ProductUpdate,
    db: DBSessionDep,
    current_user: CurrentUserDep,
):
    service = ProductService(db)
    try:
        product = await service.update_product(product_id, body.model_dump(exclude_none=True), str(current_user.id))
        return {"success": True, "data": ProductResponse.model_validate(product)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{product_id}/lifecycle/logs")
async def get_lifecycle_logs(product_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = ProductService(db)
    logs = await service.get_lifecycle_logs(product_id)
    return {"success": True, "data": logs}


@router.post("/{product_id}/lifecycle/transition")
async def transition_lifecycle(
    product_id: str,
    body: LifecycleTransitionRequest,
    db: DBSessionDep,
    current_user: CurrentUserDep,
):
    service = ProductService(db)
    try:
        product, log = await service.transition_lifecycle(
            product_id, body.to_status, str(current_user.id), body.reason
        )
        return {"success": True, "data": {"product": ProductResponse.model_validate(product), "log": LifecycleChangeLogResponse.model_validate(log)}}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

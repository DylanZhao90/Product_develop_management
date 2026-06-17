"""Certification management — track product certifications and expiry."""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.schemas.certification import CertificationCreate, CertificationResponse, CertificationUpdate
from app.services.certification_service import CertificationService

router = APIRouter(prefix="/certifications", tags=["certifications"])


@router.get("")
async def list_certifications(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    product_id: str | None = None,
    cert_type: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = CertificationService(db)
    skip = (page - 1) * page_size
    certs, total = await service.get_certifications(
        skip=skip, limit=page_size, product_id=product_id, cert_type=cert_type, status=status
    )
    return {
        "success": True,
        "data": [CertificationResponse.model_validate(c) for c in certs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_certification(
    body: CertificationCreate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = CertificationService(db)
    cert = await service.create_certification(body.model_dump(), str(current_user.id))
    return {"success": True, "data": CertificationResponse.model_validate(cert)}


@router.get("/{cert_id}")
async def get_certification(cert_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = CertificationService(db)
    cert = await service.get_certification(cert_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certification not found")
    return {"success": True, "data": CertificationResponse.model_validate(cert)}


@router.patch("/{cert_id}")
async def update_certification(
    cert_id: str, body: CertificationUpdate, db: DBSessionDep, current_user: CurrentUserDep,
):
    service = CertificationService(db)
    cert = await service.update_certification(cert_id, body.model_dump(exclude_none=True), str(current_user.id))
    return {"success": True, "data": CertificationResponse.model_validate(cert)}


@router.delete("/{cert_id}")
async def delete_certification(cert_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = CertificationService(db)
    await service.delete_certification(cert_id, str(current_user.id))
    return {"success": True, "message": "认证已删除"}


@router.get("/expiring/list")
async def expiring_certifications(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    days: int = Query(90, ge=1, le=365),
):
    service = CertificationService(db)
    certs = await service.get_expiring(days=days)
    return {"success": True, "data": [CertificationResponse.model_validate(c) for c in certs]}

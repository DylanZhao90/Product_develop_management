"""Design file management — upload, version control, download via MinIO."""

import uuid

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.core.deps import CurrentUserDep, DBSessionDep
from app.core.minio_client import get_file_url, upload_file
from app.schemas.design import DesignFileResponse
from app.services.design_service import DesignService

router = APIRouter(prefix="/design-files", tags=["design"])


@router.get("")
async def list_design_files(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    product_id: str | None = None,
    file_type: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    service = DesignService(db)
    skip = (page - 1) * page_size
    files, total = await service.get_design_files(
        skip=skip, limit=page_size, product_id=product_id, file_type=file_type, search=search,
    )
    return {
        "success": True,
        "data": [DesignFileResponse.model_validate(f) for f in files],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_design_file_multipart(
    db: DBSessionDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
    product_id: str = Form(...),
    change_notes: str = Form(""),
):
    content = await file.read()
    object_key = f"design-files/{product_id}/{uuid.uuid4()}/{file.filename}"
    await upload_file(object_key, content, file.content_type or "application/octet-stream")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown"
    service = DesignService(db)
    design_file = await service.create_design_file(
        {
            "product_id": product_id,
            "file_name": file.filename,
            "file_type": ext,
            "file_url": object_key,
            "file_size": len(content),
            "change_notes": change_notes,
        },
        str(current_user.id),
    )
    return {"success": True, "data": DesignFileResponse.model_validate(design_file)}


@router.get("/{file_id}")
async def get_design_file(file_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = DesignService(db)
    f = await service.get_design_file(file_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return {"success": True, "data": DesignFileResponse.model_validate(f)}


@router.get("/{file_id}/download")
async def download_design_file(file_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = DesignService(db)
    f = await service.get_design_file(file_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    presigned_url = await get_file_url(f.file_url)
    return {"success": True, "data": {"download_url": presigned_url, "file_name": f.file_name}}


@router.get("/{file_id}/versions")
async def get_file_versions(file_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = DesignService(db)
    f = await service.get_design_file(file_id)
    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    versions = await service.get_versions(file_id)
    return {"success": True, "data": [DesignFileResponse.model_validate(v) for v in versions]}


@router.delete("/{file_id}")
async def delete_design_file(file_id: str, db: DBSessionDep, current_user: CurrentUserDep):
    service = DesignService(db)
    await service.delete_design_file(file_id, str(current_user.id))
    return {"success": True, "message": "设计文件已删除"}

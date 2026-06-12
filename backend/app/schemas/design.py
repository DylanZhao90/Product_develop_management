from datetime import datetime

from pydantic import BaseModel


class DesignFileCreate(BaseModel):
    product_id: str
    file_name: str
    file_type: str  # step | igs | pdf | stl | dxf
    file_url: str
    file_size: int | None = None
    change_notes: str | None = None


class DesignFileUpdate(BaseModel):
    file_name: str | None = None
    is_current: bool | None = None
    change_notes: str | None = None


class DesignFileResponse(BaseModel):
    id: str
    product_id: str
    file_name: str
    file_type: str
    version: int = 1
    file_url: str
    file_size: int | None = None
    uploaded_by: str | None = None
    is_current: bool = True
    change_notes: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}

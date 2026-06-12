from datetime import datetime
from typing import Any

from pydantic import BaseModel


# ---- Supplier ----

class SupplierCreate(BaseModel):
    name: str
    type: str  # design | module_dev
    contact_name: str | None = None
    contact_email: str | None = None
    contact_feishu_id: str | None = None
    qualification_files: list[str] | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_feishu_id: str | None = None
    qualification_files: list[str] | None = None
    rating: float | None = None
    on_time_delivery_rate: float | None = None
    status: str | None = None
    notes: str | None = None


class SupplierResponse(BaseModel):
    id: str
    name: str
    type: str
    contact_name: str | None = None
    contact_email: str | None = None
    contact_feishu_id: str | None = None
    qualification_files: Any | None = None
    rating: float | None = None
    on_time_delivery_rate: float | None = None
    status: str = "active"
    notes: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---- Outsource Task ----

class OutsourceTaskCreate(BaseModel):
    supplier_id: str
    project_task_id: str | None = None
    title: str
    rfq_url: str | None = None
    quotation_amount: float | None = None


class OutsourceTaskUpdate(BaseModel):
    title: str | None = None
    rfq_url: str | None = None
    quotation_amount: float | None = None
    deliverable_urls: list[str] | None = None
    review_status: str | None = None
    review_comment: str | None = None


class OutsourceTaskReview(BaseModel):
    review_status: str  # approved | rejected
    review_comment: str | None = None


class OutsourceTaskResponse(BaseModel):
    id: str
    supplier_id: str
    project_task_id: str | None = None
    title: str
    rfq_url: str | None = None
    quotation_amount: float | None = None
    deliverable_urls: Any | None = None
    review_status: str = "pending_review"
    review_comment: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

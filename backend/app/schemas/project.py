from datetime import date, datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    product_id: str
    name: str
    type: str = "new_product"  # new_product | version_upgrade
    feasibility_doc_url: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    feasibility_doc_url: str | None = None
    status: str | None = None  # in_progress | completed | closed


class ProjectResponse(BaseModel):
    id: str
    product_id: str
    name: str
    type: str
    feasibility_doc_url: str | None = None
    approval_id: str | None = None
    feishu_chat_id: str | None = None
    status: str = "pending_approval"
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProjectTaskCreate(BaseModel):
    name: str
    parent_task_id: str | None = None
    responsible_role: str | None = None
    assignee_feishu_id: str | None = None
    supplier_id: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    deliverables: list[dict] | None = None  # [{name,type,required}]
    sort_order: int = 0


class ProjectTaskUpdate(BaseModel):
    name: str | None = None
    responsible_role: str | None = None
    assignee_feishu_id: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_end: date | None = None
    deliverables: list[dict] | None = None
    status: str | None = None
    sort_order: int | None = None


class ProjectTaskResponse(BaseModel):
    id: str
    project_id: str
    parent_task_id: str | None = None
    name: str
    responsible_role: str | None = None
    assignee_feishu_id: str | None = None
    supplier_id: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_end: date | None = None
    deliverables: Any | None = None
    status: str = "pending"
    feishu_task_id: str | None = None
    sort_order: int = 0
    children: list["ProjectTaskResponse"] = []

    model_config = {"from_attributes": True}


class TechnicalIssueCreate(BaseModel):
    title: str
    description: str | None = None
    severity: str = "minor"  # critical | major | minor
    assigned_to: str | None = None


class TechnicalIssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    assigned_to: str | None = None
    status: str | None = None


class TechnicalIssueResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None = None
    severity: str = "minor"
    assigned_to: str | None = None
    status: str = "open"
    resolved_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(32), default="new_product")  # new_product | version_upgrade
    feasibility_doc_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_id: Mapped[str | None] = mapped_column(String(64))  # 飞书审批单号
    feishu_chat_id: Mapped[str | None] = mapped_column(String(64))  # 飞书项目群ID
    status: Mapped[str] = mapped_column(
        String(32), default="pending_approval"
    )  # pending_approval | approved | in_progress | completed | closed
    created_by: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_task_id: Mapped[str | None] = mapped_column(
        SA_UUID, ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    responsible_role: Mapped[str | None] = mapped_column(String(32))
    assignee_feishu_id: Mapped[str | None] = mapped_column(String(64))
    supplier_id: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    planned_start: Mapped[date | None] = mapped_column(Date)
    planned_end: Mapped[date | None] = mapped_column(Date)
    actual_end: Mapped[date | None] = mapped_column(Date)
    deliverables: Mapped[dict | None] = mapped_column(JSONB)  # [{name,type,required,file_url}]
    status: Mapped[str] = mapped_column(
        String(32), default="pending"
    )  # pending | in_progress | completed | blocked
    feishu_task_id: Mapped[str | None] = mapped_column(String(64))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class TechnicalIssue(Base):
    __tablename__ = "technical_issues"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16), default="minor")  # critical | major | minor
    assigned_to: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default="open"
    )  # open | investigating | resolved | closed
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

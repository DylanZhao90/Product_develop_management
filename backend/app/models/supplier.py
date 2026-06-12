import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)  # design | module_dev
    contact_name: Mapped[str | None] = mapped_column(String(64))
    contact_email: Mapped[str | None] = mapped_column(String(128))
    contact_feishu_id: Mapped[str | None] = mapped_column(String(64))
    qualification_files: Mapped[dict | None] = mapped_column(JSONB)  # [file_url, ...]
    rating: Mapped[float | None] = mapped_column(Numeric(3, 2))
    on_time_delivery_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(
        String(16), default="active"
    )  # active | suspended | blacklisted
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class OutsourceTask(Base):
    __tablename__ = "outsource_tasks"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    supplier_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    project_task_id: Mapped[str | None] = mapped_column(
        SA_UUID, ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    rfq_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    quotation_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    deliverable_urls: Mapped[dict | None] = mapped_column(JSONB)
    review_status: Mapped[str] = mapped_column(
        String(32), default="pending_review"
    )  # pending_review | approved | rejected
    review_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

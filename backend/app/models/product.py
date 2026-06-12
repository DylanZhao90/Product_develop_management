import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str | None] = mapped_column(String(32))  # ac_charger | dc_charger | portable
    target_markets: Mapped[dict | None] = mapped_column(JSONB)  # ["EU","US","JP"]
    certification_requirements: Mapped[dict | None] = mapped_column(JSONB)  # ["CE","FCC","UL"]
    lifecycle_status: Mapped[str] = mapped_column(
        String(32), default="in_development"
    )  # in_development | trial_handover | on_sale | discontinued | eol
    product_manager_id: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())


class LifecycleChangeLog(Base):
    __tablename__ = "lifecycle_change_logs"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[str] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    approval_id: Mapped[str | None] = mapped_column(String(64))  # 飞书审批单号
    changed_by: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

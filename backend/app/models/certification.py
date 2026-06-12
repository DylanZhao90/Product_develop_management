import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as SA_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Certification(Base):
    __tablename__ = "certifications"

    id: Mapped[str] = mapped_column(
        SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    product_id: Mapped[str] = mapped_column(
        SA_UUID, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cert_type: Mapped[str] = mapped_column(String(32), nullable=False)  # CE | FCC | UL | RoHS
    cert_number: Mapped[str | None] = mapped_column(String(128))
    issued_by: Mapped[str | None] = mapped_column(String(128))
    issue_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    cert_file_url: Mapped[str | None]
    status: Mapped[str] = mapped_column(
        String(16), default="valid"
    )  # valid | expiring_soon | expired
    remind_before_days: Mapped[int] = mapped_column(default=90)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

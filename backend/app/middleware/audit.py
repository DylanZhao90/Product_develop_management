"""Audit logging middleware and utilities."""

import json
import logging
import time
import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.dialects.postgresql import JSONB, UUID as SA_UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, async_session

logger = logging.getLogger(__name__)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(SA_UUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(SA_UUID, nullable=True)
    action: Mapped[str] = mapped_column(nullable=False)
    resource_type: Mapped[str | None]
    resource_id: Mapped[str | None]
    old_value: Mapped[dict | None] = mapped_column(JSONB)
    new_value: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None]
    user_agent: Mapped[str | None]
    duration_ms: Mapped[int | None]
    created_at: Mapped[float] = mapped_column(default=time.time)

    __table_args__ = {"keep_existing": True}


class AuditLogger:
    """Audit logging utility.

    Uses an independent database session (separate transaction) so audit
    entries survive caller rollbacks. If the audit write itself fails, a
    warning is logged but no exception is raised — audit failure never
    breaks business operations.
    """

    @staticmethod
    async def log(
        db: AsyncSession | None = None,
        *,
        user_id: str | None = None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        old_value: dict | None = None,
        new_value: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        duration_ms: int | None = None,
    ) -> None:
        """Write an audit log entry in its own transaction.

        The ``db`` parameter is accepted for backward compatibility but is
        **not used** — an independent session is always created internally so
        callers may roll back their own transaction without losing this entry.
        """
        try:
            async with async_session() as audit_db:
                entry = AuditLog(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    old_value=old_value,
                    new_value=new_value,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    duration_ms=duration_ms,
                )
                audit_db.add(entry)
                await audit_db.flush()
                await audit_db.commit()
        except Exception:
            logger.warning("Failed to write audit log entry", exc_info=True)

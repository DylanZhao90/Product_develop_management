"""Background task scheduler — cert expiry check, MES SN sync.

Uses asyncio.create_task on app startup. No external dependency needed.
"""

import asyncio

from app.services.certification_service import CertificationService


async def _check_cert_expiry(db_factory):
    """Check certifications expiring soon and update their status."""
    async with db_factory() as db:
        try:
            service = CertificationService(db)
            count = await service.check_expiry_and_update_status()
            await db.commit()
        except Exception:
            await db.rollback()


async def _run_scheduler(db_factory, interval: int = 3600):
    """Run background tasks periodically. Default: every 1 hour."""
    import logging
    logger = logging.getLogger(__name__)
    await asyncio.sleep(60)  # First run after 1 minute for quick feedback
    while True:
        try:
            await _check_cert_expiry(db_factory)
        except Exception as e:
            logger.error(f"Scheduler failed during cert expiry check: {e}", exc_info=True)
        await asyncio.sleep(interval)


def start_scheduler(db_factory):
    """Start the background scheduler. Call on app startup."""
    asyncio.create_task(_run_scheduler(db_factory))

"""Feishu webhook callbacks — approval status changes and event subscriptions.

Verifies Feishu signatures on incoming requests before processing.
"""

import hashlib
import hmac
import logging

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.deps import DBSessionDep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/callbacks/feishu", tags=["callbacks"])

settings = get_settings()


def _verify_feishu_signature(timestamp: str, nonce: str, body: str, signature: str) -> bool:
    """Verify the request is from Feishu by checking the HMAC-SHA256 signature."""
    if not settings.feishu_encrypt_key:
        logger.warning("feishu_encrypt_key not configured — signature verification not possible")
        return False

    data = f"{timestamp}{nonce}{settings.feishu_encrypt_key}{body}"
    expected = hmac.new(settings.feishu_encrypt_key.encode(), data.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/approval")
async def approval_callback(request: Request, db: DBSessionDep):
    """Handle Feishu approval instance status change callbacks.

    Updates project status based on approval result:
    - APPROVED → project.status = "approved"
    - REJECTED → project.status = "closed"
    - CANCELED → project.status = "pending_approval"
    """
    timestamp = request.headers.get("X-Lark-Request-Timestamp", "")
    nonce = request.headers.get("X-Lark-Request-Nonce", "")
    signature = request.headers.get("X-Lark-Signature", "")

    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    if not _verify_feishu_signature(timestamp, nonce, body_str, signature):
        return {"code": 1, "message": "signature verification failed"}

    import json

    body = json.loads(body_str)

    event_type = body.get("type", "")
    instance_id = body.get("instance_id", "")
    approval_status = body.get("status", "")

    if event_type == "url_verification":
        return {"challenge": body.get("challenge")}

    if instance_id and approval_status:
        from sqlalchemy import update

        from app.models.project import Project

        status_map = {
            "APPROVED": "approved",
            "REJECTED": "closed",
            "CANCELED": "pending_approval",
        }
        new_status = status_map.get(approval_status)
        if new_status:
            await db.execute(
                update(Project)
                .where(Project.approval_id == instance_id)
                .values(status=new_status)
            )
            await db.flush()

            from app.core.event_bus import Topics, event_bus
            from sqlalchemy import select

            result = await db.execute(
                select(Project).where(Project.approval_id == instance_id)
            )
            project = result.scalar_one_or_none()
            if project:
                if new_status == "approved":
                    await event_bus.publish(Topics.APPROVAL_APPROVED, {
                        "project_name": project.name,
                        "created_by": str(project.created_by) if project.created_by else "",
                    })
                elif new_status == "closed":
                    await event_bus.publish(Topics.APPROVAL_REJECTED, {
                        "project_name": project.name,
                        "created_by": str(project.created_by) if project.created_by else "",
                    })

    return {"code": 0, "message": "ok"}


@router.post("/event")
async def event_callback(request: Request):
    """Handle Feishu event subscription (card clicks, bot mentions, etc.)."""
    timestamp = request.headers.get("X-Lark-Request-Timestamp", "")
    nonce = request.headers.get("X-Lark-Request-Nonce", "")
    signature = request.headers.get("X-Lark-Signature", "")

    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    if not _verify_feishu_signature(timestamp, nonce, body_str, signature):
        return {"code": 1, "message": "signature verification failed"}

    import json

    body = json.loads(body_str)

    if body.get("type") == "url_verification":
        return {"challenge": body.get("challenge")}

    return {"code": 0, "message": "ok"}

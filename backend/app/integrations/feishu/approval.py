"""Feishu Approval integration - create approval instances and handle callbacks."""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus import Topics, event_bus
from app.integrations.feishu.client import FeishuClient

logger = logging.getLogger(__name__)


class FeishuApprovalClient(FeishuClient):
    async def create_approval(self, project) -> dict:
        """Create a Feishu approval instance for project review.

        Approval definition code must be pre-configured in Feishu admin console.
        """
        return await self.post(
            "/approval/v4/instances",
            json={
                "approval_code": "PROJECT_REVIEW",  # pre-configured in Feishu
                "user_id": str(project.created_by),
                "form": [
                    {
                        "id": "project_name",
                        "type": "input",
                        "value": project.name,
                    },
                    {
                        "id": "product_model",
                        "type": "input",
                        "value": project.product_id,
                    },
                    {
                        "id": "project_type",
                        "type": "input",
                        "value": project.type,
                    },
                    {
                        "id": "feasibility_doc",
                        "type": "input",
                        "value": project.feasibility_doc_url or "",
                    },
                ],
            },
        )

    async def get_approval_by_id(self, approval_id: str) -> dict:
        """Get approval instance details."""
        return await self.get(
            f"/approval/v4/approvals/{approval_id}",
        )

    async def cancel_approval(self, approval_id: str) -> dict:
        """Cancel an approval instance."""
        return await self.post(
            f"/approval/v4/instances/{approval_id}/cancel",
        )


async def handle_approval_callback(body: dict, db: AsyncSession) -> dict:
    """Process Feishu approval callback.

    Called when an approval instance status changes (approved/rejected/canceled).
    Updates the related project status and publishes an event for notification.

    Event structure from Feishu:
    {
        "type": "approval_instance",
        "instance_id": "xxx",
        "approval_code": "PROJECT_REVIEW",
        "status": "APPROVED",  // APPROVED | REJECTED | CANCELED
    }
    """
    from app.repositories.project_repo import ProjectRepository

    instance_id = body.get("instance_id")
    approval_code = body.get("approval_code")
    new_status = body.get("status")

    if not instance_id or not new_status:
        logger.warning("Approval callback missing instance_id or status: %s", body)
        return {"success": False, "message": "Invalid callback payload"}

    if approval_code != "PROJECT_REVIEW":
        logger.info("Ignoring non-project approval callback: %s", approval_code)
        return {"success": True, "message": "Ignored — not a project approval"}

    # Find the project by approval_id
    project_repo = ProjectRepository(db)
    project = await project_repo.get_by_approval_id(instance_id)
    if not project:
        logger.warning("No project found for approval instance: %s", instance_id)
        return {"success": False, "message": "Project not found"}

    # Map Feishu approval status to project status
    status_map = {
        "APPROVED": "approved",
        "REJECTED": "pending_approval",
        "CANCELED": "closed",
    }
    mapped_status = status_map.get(new_status)
    if mapped_status is None:
        logger.warning("Unknown approval status: %s", new_status)
        return {"success": False, "message": f"Unknown status: {new_status}"}

    old_status = project.status
    project.status = mapped_status
    await project_repo.update(project)
    await db.commit()

    logger.info(
        "Approval callback: project %s: %s → %s (feishu: %s)",
        project.name, old_status, mapped_status, new_status,
    )

    # Publish event for notification
    if mapped_status == "approved":
        await event_bus.publish(
            Topics.APPROVAL_APPROVED,
            {
                "project_id": str(project.id),
                "project_name": project.name,
                "created_by": str(project.created_by) if project.created_by else None,
            },
        )
    elif mapped_status == "pending_approval":
        await event_bus.publish(
            Topics.APPROVAL_REJECTED,
            {
                "project_id": str(project.id),
                "project_name": project.name,
                "created_by": str(project.created_by) if project.created_by else None,
            },
        )

    return {"success": True, "message": f"Project status updated to {mapped_status}"}

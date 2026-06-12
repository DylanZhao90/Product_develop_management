"""Feishu Approval integration - create approval instances and handle callbacks."""

from app.integrations.feishu.client import FeishuClient


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


async def handle_approval_callback(body: dict, db) -> None:
    """Process Feishu approval callback.

    Called when an approval instance status changes (approved/rejected/canceled).
    Updates the related project status and notifies the applicant.

    Event structure from Feishu:
    {
        "type": "approval_instance",
        "instance_id": "xxx",
        "approval_code": "PROJECT_REVIEW",
        "status": "APPROVED",  // APPROVED | REJECTED | CANCELED
    }
    """
    # Decrypt and validate the callback body using Feishu verification
    # Then update the related resource based on approval_code and instance_id
    pass  # Implemented when Feishu app credentials are configured

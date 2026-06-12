"""Event bus subscribers — send Feishu notifications, update derived state."""

from app.core.event_bus import Topics, event_bus
from app.integrations.feishu.bot import notify_task_overdue, notify_cert_expiring


async def _on_task_assigned(data: dict):
    assignee = data.get("assignee_feishu_id")
    task_name = data.get("task_name", "")
    if assignee:
        from app.integrations.feishu.bot import FeishuBotClient

        client = FeishuBotClient()
        await client.send_card_message(
            assignee,
            title="New Task Assigned",
            content=f"You have been assigned a new task: **{task_name}**",
        )


async def _on_task_overdue(data: dict):
    user_id = data.get("assignee_feishu_id")
    task_name = data.get("task_name", "")
    if user_id:
        await notify_task_overdue(user_id, task_name, "")


async def _on_cert_expiring(data: dict):
    user_id = data.get("user_feishu_id")
    cert_type = data.get("cert_type", "")
    days = data.get("days_left", 0)
    if user_id:
        await notify_cert_expiring(user_id, cert_type, days)


async def _on_product_discontinued(data: dict):
    from app.integrations.feishu.bot import FeishuBotClient

    client = FeishuBotClient()
    # Notify PM — in production, look up PM's feishu_id
    product_name = data.get("product_name", "")
    await client.send_text_message(
        "admin",  # placeholder — real implementation queries PM's feishu_id
        receive_type="open_id",
        text=f"Product **{product_name}** has been discontinued.",
    )


async def _on_approval_approved(data: dict):
    from app.integrations.feishu.bot import FeishuBotClient

    client = FeishuBotClient()
    project_name = data.get("project_name", "")
    created_by = data.get("created_by", "")
    if created_by:
        await client.send_card_message(
            created_by,
            title="Project Approved",
            content=f"Your project **{project_name}** has been approved.",
        )


async def _on_approval_rejected(data: dict):
    from app.integrations.feishu.bot import FeishuBotClient

    client = FeishuBotClient()
    project_name = data.get("project_name", "")
    created_by = data.get("created_by", "")
    if created_by:
        await client.send_card_message(
            created_by,
            title="Project Rejected",
            content=f"Your project **{project_name}** has been rejected. Please revise and resubmit.",
        )


def register_event_handlers():
    event_bus.subscribe(Topics.TASK_ASSIGNED, _on_task_assigned)
    event_bus.subscribe(Topics.TASK_OVERDUE, _on_task_overdue)
    event_bus.subscribe(Topics.CERTIFICATION_EXPIRING, _on_cert_expiring)
    event_bus.subscribe(Topics.PRODUCT_DISCONTINUED, _on_product_discontinued)
    event_bus.subscribe(Topics.APPROVAL_APPROVED, _on_approval_approved)
    event_bus.subscribe(Topics.APPROVAL_REJECTED, _on_approval_rejected)

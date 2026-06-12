"""Feishu Bot (custom robot) - send interactive card messages."""

from app.integrations.feishu.client import FeishuClient


class FeishuBotClient(FeishuClient):
    async def send_card_message(
        self,
        receive_id: str,
        receive_type: str = "open_id",  # open_id | user_id | chat_id
        *,
        title: str,
        content: str,
        elements: list[dict] | None = None,
        url: str | None = None,
    ) -> dict:
        """Send an interactive card message to a user or group chat.

        Args:
            receive_id: Feishu user open_id or chat_id
            receive_type: 'open_id', 'user_id', or 'chat_id'
            title: Card title (blue text at top)
            content: Main card body (markdown supported)
            elements: Interactive elements (buttons, selectors, etc.)
            url: URL for the card click redirect
        """
        card = {
            "config": {"wide_screen_mode": True},
            "header": {
                "title": {"tag": "plain_text", "content": title},
                "template": "blue",
            },
            "elements": [
                {"tag": "markdown", "content": content},
            ],
        }

        if elements:
            card["elements"].extend(elements)

        if url:
            card["elements"].append(
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {"tag": "plain_text", "content": "View Details"},
                            "type": "primary",
                            "url": url,
                        }
                    ],
                }
            )

        return await self.post(
            "/im/v1/messages",
            params={"receive_id_type": receive_type},
            json={
                "receive_id": receive_id,
                "msg_type": "interactive",
                "content": card,
            },
        )

    async def send_text_message(
        self,
        receive_id: str,
        receive_type: str = "open_id",
        text: str = "",
    ) -> dict:
        """Send a simple text message."""
        return await self.post(
            "/im/v1/messages",
            params={"receive_id_type": receive_type},
            json={
                "receive_id": receive_id,
                "msg_type": "text",
                "content": {"text": text},
            },
        )

    async def send_to_chat_group(self, chat_id: str, title: str, content: str) -> dict:
        """Send a card message to a Feishu group chat."""
        return await self.send_card_message(chat_id, receive_type="chat_id", title=title, content=content)


async def notify_task_overdue(user_feishu_id: str, task_name: str, task_url: str) -> None:
    """Notify user about overdue task via Feishu bot."""
    client = FeishuBotClient()
    await client.send_card_message(
        user_feishu_id,
        title="Task Overdue",
        content=f"Your task **{task_name}** is overdue. Please complete it as soon as possible.",
        url=task_url,
    )


async def notify_cert_expiring(user_feishu_id: str, cert_type: str, days_left: int) -> None:
    """Notify user about expiring certification."""
    client = FeishuBotClient()
    await client.send_card_message(
        user_feishu_id,
        title="Certification Expiring Soon",
        content=f"**{cert_type}** certification will expire in **{days_left}** days. Please prepare for renewal.",
    )

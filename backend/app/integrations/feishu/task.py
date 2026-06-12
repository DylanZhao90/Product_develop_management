"""Feishu Task integration - sync project tasks as Feishu to-dos."""

from app.integrations.feishu.client import FeishuClient


class FeishuTaskClient(FeishuClient):
    async def create_task(
        self,
        user_feishu_id: str,
        title: str,
        *,
        description: str = "",
        due_time: str | None = None,  # unix timestamp ms
        extra: str | None = None,
    ) -> dict:
        """Create a task in Feishu Task Center for a user.

        The task will appear in the user's Feishu "To-do" list.
        """
        payload = {
            "user_id": user_feishu_id,
            "title": title,
        }
        if description:
            payload["description"] = description
        if due_time:
            payload["due"] = {"time": due_time}
        if extra:
            payload["extra"] = extra

        return await self.post("/task/v1/tasks", json=payload)

    async def update_task_status(self, task_id: str, is_completed: bool) -> dict:
        """Mark a Feishu task as completed or not."""
        return await self.patch(
            f"/task/v1/tasks/{task_id}",
            json={"is_completed": is_completed},
        )

    async def delete_task(self, task_id: str) -> dict:
        """Delete a Feishu task."""
        return await self.delete(f"/task/v1/tasks/{task_id}")

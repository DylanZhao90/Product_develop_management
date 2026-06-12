"""Feishu Calendar integration - sync project milestones as calendar events."""

from datetime import datetime, timezone

from app.integrations.feishu.client import FeishuClient


class FeishuCalendarClient(FeishuClient):
    async def create_event(
        self,
        calendar_id: str,
        summary: str,
        start_time: datetime,
        end_time: datetime,
        *,
        description: str = "",
        attendees: list[dict] | None = None,
    ) -> dict:
        """Create a calendar event in Feishu.

        Args:
            calendar_id: Feishu calendar ID (primary calendar or resource calendar)
            summary: Event title
            start_time: Start datetime (UTC)
            end_time: End datetime (UTC)
            description: Event description
            attendees: List of attendee open_ids: [{"id": "ou_xxx", "type": "user"}]
        """
        payload = {
            "summary": summary,
            "start_time": {
                "timestamp": str(int(start_time.timestamp())),
            },
            "end_time": {
                "timestamp": str(int(end_time.timestamp())),
            },
        }
        if description:
            payload["description"] = description
        if attendees:
            payload["attendees"] = attendees

        return await self.post(
            f"/calendar/v4/calendars/{calendar_id}/events",
            json=payload,
        )

    async def create_milestone_event(
        self,
        calendar_id: str,
        milestone_name: str,
        date: datetime,
        project_name: str,
        attendees: list[str] | None = None,
    ) -> dict:
        """Create a full-day milestone event on the project calendar."""
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = date.replace(hour=23, minute=59, second=59, microsecond=0)
        attendee_list = [{"id": aid, "type": "user"} for aid in attendees] if attendees else None
        return await self.create_event(
            calendar_id=calendar_id,
            summary=f"[Milestone] {milestone_name}",
            start_time=start,
            end_time=end,
            description=f"Project: {project_name}\nMilestone: {milestone_name}",
            attendees=attendee_list,
        )

    async def delete_event(self, calendar_id: str, event_id: str) -> dict:
        """Delete a calendar event."""
        return await self.delete(
            f"/calendar/v4/calendars/{calendar_id}/events/{event_id}",
        )

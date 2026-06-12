"""Simple event bus for decoupling business logic from notifications."""

import asyncio
from collections import defaultdict
from typing import Any, Awaitable, Callable

Handler = Callable[[dict[str, Any]], Awaitable[None]]


class EventBus:
    """Lightweight in-process pub/sub event bus.

    Each instance has its own topic → handler registry so that state is
    never shared across modules or test runs by accident.
    """

    def __init__(self) -> None:
        self._topics: dict[str, list[Handler]] = defaultdict(list)

    def subscribe(self, topic: str, handler: Handler) -> None:
        self._topics[topic].append(handler)

    async def publish(self, topic: str, data: dict[str, Any]) -> None:
        import logging
        logger = logging.getLogger(__name__)
        handlers = self._topics.get(topic, [])
        if not handlers:
            return
        results = await asyncio.gather(
            *(asyncio.wait_for(handler(data), timeout=10) for handler in handlers),
            return_exceptions=True,
        )
        for handler, result in zip(handlers, results):
            if isinstance(result, Exception):
                logger.error(f"Event handler {handler.__name__} failed for topic {topic}: {result}")

    def clear(self) -> None:
        self._topics.clear()


# Module-level singleton — import and use in application code.
event_bus = EventBus()


# Predefined event topics
class Topics:
    TASK_OVERDUE = "task.overdue"
    TASK_ASSIGNED = "task.assigned"
    TASK_COMPLETED = "task.completed"
    CERTIFICATION_EXPIRING = "certification.expiring"
    CERTIFICATION_EXPIRED = "certification.expired"
    APPROVAL_APPROVED = "approval.approved"
    APPROVAL_REJECTED = "approval.rejected"
    MILESTONE_REACHED = "milestone.reached"
    PRODUCT_DISCONTINUED = "product.discontinued"
    FIRMWARE_UPGRADE_COMPLETED = "firmware.upgrade_completed"

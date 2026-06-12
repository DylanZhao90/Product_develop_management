"""Shared utility functions for the application."""

from typing import Any


def update_entity_attrs(entity: Any, data: dict) -> None:
    """Set non-None attributes from *data* onto *entity* if they exist as attributes.

    Only sets attributes where the value is not None and the entity has the
    corresponding attribute. Handles both SQLAlchemy model instances and any
    object with ``hasattr``/``setattr`` support.

    Args:
        entity: The model or object instance to update.
        data: Dictionary of attribute names and values.
    """
    for key, value in data.items():
        if value is not None and hasattr(entity, key):
            setattr(entity, key, value)

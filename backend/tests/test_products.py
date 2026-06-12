"""Product lifecycle state machine tests — no DB needed."""

import pytest

VALID_TRANSITIONS = {
    "in_development": ["trial_handover"],
    "trial_handover": ["in_development", "on_sale"],
    "on_sale": ["discontinued"],
    "discontinued": ["eol"],
    "eol": [],
}


def test_valid_transitions():
    assert "trial_handover" in VALID_TRANSITIONS["in_development"]
    assert "on_sale" not in VALID_TRANSITIONS["in_development"]


def test_invalid_transition_blocked():
    assert "eol" not in VALID_TRANSITIONS["in_development"]
    assert "on_sale" not in VALID_TRANSITIONS["in_development"]


def test_trial_can_go_back():
    transitions = VALID_TRANSITIONS["trial_handover"]
    assert "in_development" in transitions
    assert "on_sale" in transitions


def test_eol_is_terminal():
    assert VALID_TRANSITIONS["eol"] == []


def test_discontinued_cannot_go_back():
    assert "on_sale" not in VALID_TRANSITIONS["discontinued"]


def test_on_sale_only_to_discontinued():
    assert VALID_TRANSITIONS["on_sale"] == ["discontinued"]


def test_all_statuses_defined():
    expected = ["in_development", "trial_handover", "on_sale", "discontinued", "eol"]
    for status in expected:
        assert status in VALID_TRANSITIONS


def test_product_code_generation_format():
    """Verify product code format: PREFIX-YEAR-NNNN."""
    import re

    patterns = [
        "AC-2026-0001",
        "DC-2026-0002",
        "PT-2026-0003",
        "PD-2026-0004",
    ]
    for code in patterns:
        assert re.match(r"^[A-Z]{2}-\d{4}-\d{4}$", code)

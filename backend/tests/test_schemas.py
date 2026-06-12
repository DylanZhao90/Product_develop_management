"""Pydantic schema validation tests."""

import pytest
from pydantic import ValidationError

from app.schemas.product import ProductCreate, ProductUpdate, LifecycleTransitionRequest
from app.schemas.project import ProjectCreate, ProjectTaskCreate, TechnicalIssueCreate


def test_product_create_valid():
    p = ProductCreate(model="AC-MODEL", name="Test Charger")
    assert p.model == "AC-MODEL"
    assert p.name == "Test Charger"
    assert p.type is None


def test_product_create_missing_required():
    with pytest.raises(ValidationError):
        ProductCreate()  # model and name required


def test_product_create_with_type():
    p = ProductCreate(model="X", name="Y", type="ac_charger")
    assert p.type == "ac_charger"


def test_product_update_partial():
    p = ProductUpdate(name="New Name")
    assert p.name == "New Name"
    assert p.model is None  # not required for update


def test_lifecycle_transition_requires_to_status():
    with pytest.raises(ValidationError):
        LifecycleTransitionRequest()


def test_lifecycle_transition_valid():
    t = LifecycleTransitionRequest(to_status="on_sale", reason="Approved")
    assert t.to_status == "on_sale"
    assert t.reason == "Approved"


def test_project_create_valid():
    p = ProjectCreate(product_id="uuid-1", name="Project X")
    assert p.product_id == "uuid-1"
    assert p.type == "new_product"


def test_project_create_missing_required():
    with pytest.raises(ValidationError):
        ProjectCreate(name="X")  # product_id required


def test_project_task_create():
    t = ProjectTaskCreate(name="Task 1")
    assert t.name == "Task 1"
    assert t.sort_order == 0


def test_technical_issue_create():
    i = TechnicalIssueCreate(title="Bug")
    assert i.title == "Bug"
    assert i.severity == "minor"


def test_issue_severity_defaults():
    i = TechnicalIssueCreate(title="Bug", severity="critical")
    assert i.severity == "critical"

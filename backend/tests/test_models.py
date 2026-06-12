"""Verify all models import and have correct table names."""

import pytest
from sqlalchemy import inspect

from app.core.database import Base


def test_all_tables_have_names():
    """Every model must have a __tablename__."""
    table_names = {t: getattr(Base.registry._class_registry.get(t), "__tablename__", None) for t in Base.registry._class_registry}
    for cls_name, table_name in table_names.items():
        if cls_name.startswith("_"):
            continue
        assert table_name is not None, f"{cls_name} missing __tablename__"


def test_expected_tables_registered():
    """Verify all 13 tables are registered in metadata."""
    table_names = sorted(Base.metadata.tables.keys())
    expected = [
        "audit_logs",
        "certifications",
        "design_files",
        "firmware_upgrade_tasks",
        "firmware_versions",
        "lifecycle_change_logs",
        "outsource_tasks",
        "products",
        "project_tasks",
        "projects",
        "suppliers",
        "technical_issues",
        "users",
    ]
    for table in expected:
        assert table in table_names, f"Table {table} not registered in metadata"


def test_product_table_columns():
    columns = [c.name for c in Base.metadata.tables["products"].columns]
    expected = [
        "id", "code", "model", "name", "type", "target_markets",
        "certification_requirements", "lifecycle_status", "product_manager_id",
        "thumbnail_url", "description", "created_at", "updated_at",
    ]
    for col in expected:
        assert col in columns, f"Column {col} missing from products"


def test_project_table_columns():
    columns = [c.name for c in Base.metadata.tables["projects"].columns]
    expected = [
        "id", "product_id", "name", "type", "feasibility_doc_url",
        "approval_id", "feishu_chat_id", "status", "created_by", "created_at", "updated_at",
    ]
    for col in expected:
        assert col in columns, f"Column {col} missing from projects"

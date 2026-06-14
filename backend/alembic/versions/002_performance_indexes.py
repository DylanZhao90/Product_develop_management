"""performance indexes

Revision ID: 002_performance_indexes
Revises: 001_initial
Create Date: 2026-06-14

Add composite indexes for frequently queried columns:
  - projects(product_id, status)
  - project_tasks(project_id, status)
  - certifications(product_id, status)
  - products(type, lifecycle_status)
  - firmware_upgrade_tasks(firmware_version_id, status)
  - audit_logs(resource_type, resource_id, created_at)

These are well-known query patterns across dashboard, analytics, and list endpoints.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "002_performance_indexes"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # projects: filtered by product + status on dashboard and list pages
    op.create_index(
        "ix_projects_product_status",
        "projects",
        ["product_id", "status"],
    )

    # project_tasks: filtered by project + status on project detail and dashboard
    op.create_index(
        "ix_project_tasks_project_status",
        "project_tasks",
        ["project_id", "status"],
    )

    # certifications: filtered by product + status on product detail and expiry checks
    op.create_index(
        "ix_certifications_product_status",
        "certifications",
        ["product_id", "status"],
    )
    op.create_index(
        "ix_certifications_expiry_date",
        "certifications",
        ["expiry_date"],
    )

    # products: filtered by type + status on product list
    op.create_index(
        "ix_products_type_status",
        "products",
        ["type", "lifecycle_status"],
    )

    # firmware_upgrade_tasks: filtered by version + status
    op.create_index(
        "ix_firmware_upgrade_tasks_version_status",
        "firmware_upgrade_tasks",
        ["firmware_version_id", "status"],
    )

    # audit_logs: filtered by resource type + id, ordered by created_at
    op.create_index(
        "ix_audit_logs_resource_created",
        "audit_logs",
        ["resource_type", "resource_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_resource_created", table_name="audit_logs")
    op.drop_index("ix_firmware_upgrade_tasks_version_status", table_name="firmware_upgrade_tasks")
    op.drop_index("ix_products_type_status", table_name="products")
    op.drop_index("ix_certifications_expiry_date", table_name="certifications")
    op.drop_index("ix_certifications_product_status", table_name="certifications")
    op.drop_index("ix_project_tasks_project_status", table_name="project_tasks")
    op.drop_index("ix_projects_product_status", table_name="projects")

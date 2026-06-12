"""initial schema

Revision ID: 001_initial
Revises: None
Create Date: 2026-06-10

All core tables for PDM system.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("feishu_open_id", sa.String(64), unique=True, index=True, nullable=True),
        sa.Column("feishu_union_id", sa.String(64), nullable=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("email", sa.String(128), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("role", sa.String(32), default="engineer"),
        sa.Column("supplier_id", postgresql.UUID(), nullable=True),
        sa.Column("language_pref", sa.String(8), default="zh-CN"),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("code", sa.String(32), unique=True, nullable=False, index=True),
        sa.Column("model", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("type", sa.String(32), nullable=True),
        sa.Column("target_markets", postgresql.JSONB(), nullable=True),
        sa.Column("certification_requirements", postgresql.JSONB(), nullable=True),
        sa.Column("lifecycle_status", sa.String(32), default="in_development"),
        sa.Column("product_manager_id", postgresql.UUID(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "lifecycle_change_logs",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("product_id", postgresql.UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String(32), nullable=False),
        sa.Column("to_status", sa.String(32), nullable=False),
        sa.Column("approval_id", sa.String(64), nullable=True),
        sa.Column("changed_by", postgresql.UUID(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("product_id", postgresql.UUID(), sa.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("type", sa.String(32), default="new_product"),
        sa.Column("feasibility_doc_url", sa.Text(), nullable=True),
        sa.Column("approval_id", sa.String(64), nullable=True),
        sa.Column("feishu_chat_id", sa.String(64), nullable=True),
        sa.Column("status", sa.String(32), default="pending_approval"),
        sa.Column("created_by", postgresql.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "project_tasks",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("project_id", postgresql.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("parent_task_id", postgresql.UUID(), sa.ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("responsible_role", sa.String(32), nullable=True),
        sa.Column("assignee_feishu_id", sa.String(64), nullable=True),
        sa.Column("supplier_id", postgresql.UUID(), nullable=True),
        sa.Column("planned_start", sa.Date(), nullable=True),
        sa.Column("planned_end", sa.Date(), nullable=True),
        sa.Column("actual_end", sa.Date(), nullable=True),
        sa.Column("deliverables", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(32), default="pending"),
        sa.Column("feishu_task_id", sa.String(64), nullable=True),
        sa.Column("sort_order", sa.Integer(), default=0),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "technical_issues",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("project_id", postgresql.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(16), default="minor"),
        sa.Column("assigned_to", postgresql.UUID(), nullable=True),
        sa.Column("status", sa.String(32), default="open"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "design_files",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("product_id", postgresql.UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file_name", sa.String(256), nullable=False),
        sa.Column("file_type", sa.String(32), nullable=True),
        sa.Column("version", sa.Integer(), default=1),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(), nullable=True),
        sa.Column("is_current", sa.Boolean(), default=True),
        sa.Column("change_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("type", sa.String(32), nullable=False),
        sa.Column("contact_name", sa.String(64), nullable=True),
        sa.Column("contact_email", sa.String(128), nullable=True),
        sa.Column("contact_feishu_id", sa.String(64), nullable=True),
        sa.Column("qualification_files", postgresql.JSONB(), nullable=True),
        sa.Column("rating", sa.Numeric(3, 2), nullable=True),
        sa.Column("on_time_delivery_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("status", sa.String(16), default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "outsource_tasks",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("supplier_id", postgresql.UUID(), sa.ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("project_task_id", postgresql.UUID(), sa.ForeignKey("project_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("rfq_url", sa.Text(), nullable=True),
        sa.Column("quotation_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("deliverable_urls", postgresql.JSONB(), nullable=True),
        sa.Column("review_status", sa.String(32), default="pending_review"),
        sa.Column("review_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "certifications",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("product_id", postgresql.UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("cert_type", sa.String(32), nullable=False),
        sa.Column("cert_number", sa.String(128), nullable=True),
        sa.Column("issued_by", sa.String(128), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("cert_file_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(16), default="valid"),
        sa.Column("remind_before_days", sa.Integer(), default=90),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "firmware_versions",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("product_model", sa.String(64), nullable=False, index=True),
        sa.Column("version", sa.String(32), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("file_hash", sa.String(128), nullable=True),
        sa.Column("release_notes", sa.Text(), nullable=True),
        sa.Column("release_type", sa.String(16), default="full"),
        sa.Column("released_by", postgresql.UUID(), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "firmware_upgrade_tasks",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("firmware_version_id", postgresql.UUID(), sa.ForeignKey("firmware_versions.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("target_sn_filter", postgresql.JSONB(), nullable=True),
        sa.Column("gray_scale_percent", sa.Integer(), default=100),
        sa.Column("status", sa.String(32), default="scheduled"),
        sa.Column("success_count", sa.Integer(), default=0),
        sa.Column("failure_count", sa.Integer(), default=0),
        sa.Column("total_count", sa.Integer(), default=0),
        sa.Column("failure_reasons", postgresql.JSONB(), nullable=True),
        sa.Column("feishu_notification_sent", sa.Boolean(), default=False),
        sa.Column("created_by", postgresql.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(), primary_key=True),
        sa.Column("user_id", postgresql.UUID(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("resource_type", sa.String(), nullable=True),
        sa.Column("resource_id", sa.String(), nullable=True),
        sa.Column("old_value", postgresql.JSONB(), nullable=True),
        sa.Column("new_value", postgresql.JSONB(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.Float(), default=0),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("firmware_upgrade_tasks")
    op.drop_table("firmware_versions")
    op.drop_table("certifications")
    op.drop_table("outsource_tasks")
    op.drop_table("suppliers")
    op.drop_table("design_files")
    op.drop_table("technical_issues")
    op.drop_table("project_tasks")
    op.drop_table("projects")
    op.drop_table("lifecycle_change_logs")
    op.drop_table("products")
    op.drop_table("users")

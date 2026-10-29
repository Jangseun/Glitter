"""typing_records(타자 기록) 테이블 생성

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "typing_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text_id", sa.Integer(), sa.ForeignKey("typing_texts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=True),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column("speed", sa.Integer(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False),
        sa.Column("typo_count", sa.Integer(), nullable=False),
        sa.Column("seconds", sa.Float(), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_typing_records_user_id", "typing_records", ["user_id"])
    op.create_index("ix_typing_records_created_at", "typing_records", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_typing_records_created_at", table_name="typing_records")
    op.drop_index("ix_typing_records_user_id", table_name="typing_records")
    op.drop_table("typing_records")

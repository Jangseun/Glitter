"""커뮤니티: works에 공개 여부 추가 + 좋아요(work_likes) / 댓글(comments) 테이블

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-27

is_public에 server_default=false를 거는 이유:
이미 저장된 작품들이 있는 상태에서 NOT NULL 컬럼을 추가하면, 기존 행들에 넣을 값이 필요해요.
DB 기본값을 걸어두면 기존 작품들은 자동으로 "비공개(false)"로 채워져요.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("works") as batch:
        batch.add_column(sa.Column("is_public", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch.add_column(sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
        batch.create_index("ix_works_published_at", ["published_at"])

    op.create_table(
        "work_likes",
        # 두 컬럼을 합쳐서 기본 키 (같은 사람이 같은 작품에 두 번 좋아요 불가)
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("work_id", sa.String(length=36), sa.ForeignKey("works.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_work_likes_work_id", "work_likes", ["work_id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_id", sa.String(length=36), sa.ForeignKey("works.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comments_work_id", "comments", ["work_id"])


def downgrade() -> None:
    op.drop_index("ix_comments_work_id", table_name="comments")
    op.drop_table("comments")
    op.drop_index("ix_work_likes_work_id", table_name="work_likes")
    op.drop_table("work_likes")
    with op.batch_alter_table("works") as batch:
        batch.drop_index("ix_works_published_at")
        batch.drop_column("published_at")
        batch.drop_column("is_public")

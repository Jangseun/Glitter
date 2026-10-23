"""users 테이블 생성 + works에 user_id(작품 주인) 추가

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-23

로그인 기능 전에 저장된 작품은 주인이 없으니 user_id를 NULL로 두어요. (nullable=True)
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=20), nullable=False),
        sa.Column("nickname", sa.String(length=12), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # unique=True 인덱스: 같은 아이디가 두 번 들어가는 걸 DB 차원에서 막아요.
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # batch_alter_table: SQLite처럼 "기존 테이블에 외래 키 추가"를 못 하는 DB에서도 동작하게 해주는 방식.
    # (PostgreSQL에선 그냥 ALTER TABLE로 실행돼요)
    with op.batch_alter_table("works") as batch:
        batch.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch.create_foreign_key("fk_works_user_id_users", "users", ["user_id"], ["id"], ondelete="CASCADE")
        batch.create_index("ix_works_user_id", ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("works") as batch:
        batch.drop_index("ix_works_user_id")
        batch.drop_constraint("fk_works_user_id_users", type_="foreignkey")
        batch.drop_column("user_id")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

"""works 테이블 생성

Revision ID: 0001
Revises:
Create Date: 2026-09-28

[Alembic migration이란?]
DB 테이블 구조의 "변경 기록"이에요. git 커밋처럼 순서대로 쌓이고,
`alembic upgrade head` 를 실행하면 아직 적용 안 된 migration을 차례대로 DB에 적용해요.
(적용 여부는 DB 안의 alembic_version 테이블에 기록돼요)

앞으로 모델(app/models)을 바꾸면:
    alembic revision --autogenerate -m "무엇을 바꿨는지"
로 새 migration 파일을 만들고, 내용을 한 번 눈으로 확인한 뒤
    alembic upgrade head
로 DB에 반영하면 돼요.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# 이 migration의 ID와, 바로 앞 migration의 ID(첫 번째라서 None)
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """alembic upgrade 할 때 실행: works 테이블 생성 (app/models/work.py와 같은 구조)"""
    op.create_table(
        "works",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("mode", sa.String(length=10), nullable=False),
        sa.Column("authors", sa.JSON(), nullable=False),
        sa.Column("prompt", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_works_created_at", "works", ["created_at"])


def downgrade() -> None:
    """alembic downgrade 할 때 실행: upgrade를 정확히 반대로 되돌려요"""
    op.drop_index("ix_works_created_at", table_name="works")
    op.drop_table("works")

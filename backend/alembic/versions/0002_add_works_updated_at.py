"""works 테이블에 updated_at(마지막 수정 시각) 컬럼 추가

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-23

이미 저장된 작품들은 이 컬럼이 NULL(= 수정한 적 없음)로 채워져요.
그래서 nullable=True로 만들어야 기존 데이터가 있어도 migration이 실패하지 않아요.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"  # 바로 앞 migration → 0001 다음에 적용된다는 뜻
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("works", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("works", "updated_at")

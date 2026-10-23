"""기본 제공 "글리터" 분류 글 삭제 (분류는 남기고 비워두기)

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-23

0004에서 임시로 넣었던 Glitter 창작 글을 지워요.
"글리터" 분류 자체는 남아 있어서, 나중에 Glitter 이름으로 쓴 글을 여기에 채우면 돼요.

downgrade는 아무것도 하지 않아요.
지운 데이터를 되살리려면 원문을 여기 다시 적어야 하는데, 0004 파일에 이미 남아 있으니 거기를 참고하면 돼요.
(데이터 삭제 migration은 보통 "되돌릴 수 없음"으로 두는 경우가 많아요)
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 기본 제공 글(user_id 없음)만 지워요. 혹시 사용자가 올린 글이 있어도 건드리지 않아요.
    op.execute("DELETE FROM typing_texts WHERE category = 'glitter' AND user_id IS NULL")


def downgrade() -> None:
    pass

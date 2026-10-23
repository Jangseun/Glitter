"""Glitter가 직접 쓴 기본 글을 "glitter" 분류로 옮기기

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-23

0004에서 웹소설/수필 분류에 넣었던 Glitter 창작 글을 따로 모아요.
→ 웹소설/수필 분류에는 실제 작품만 남도록 (지금은 비어 있고, 사용자가 등록해서 채워요)

[구조가 아니라 "데이터"만 바꾸는 migration]
op.execute()로 SQL을 직접 실행해요. 테이블 모양은 그대로라 alembic check에는 영향이 없어요.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 기본 제공 글(user_id 없음) 중 지은이가 Glitter인 것만 옮겨요. 사용자가 올린 글은 건드리지 않아요.
    op.execute("UPDATE typing_texts SET category = 'glitter' WHERE author = 'Glitter' AND user_id IS NULL")


def downgrade() -> None:
    # 되돌릴 땐 원래 분류로. (0004에서 웹소설은 제목으로 구분할 수 없어서, 웹소설 목록을 직접 적어 둬요)
    op.execute(
        "UPDATE typing_texts SET category = 'webnovel' WHERE category = 'glitter' AND user_id IS NULL AND title IN "
        "('마감 끝에 눈을 뜨니', '두 번째 생의 약속', '히든 직업', '초라한 능력치', '악녀의 미소', '짐꾼의 정체')"
    )
    op.execute("UPDATE typing_texts SET category = 'essay' WHERE category = 'glitter' AND user_id IS NULL")

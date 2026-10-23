"""타자 연습용 글 테이블.

기본 제공 글(시, 소설 등)은 migration(0004)이 처음에 넣어주고,
그 뒤로는 로그인한 사용자가 직접 좋아하는 글귀를 등록할 수 있어요.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User

# 글 분류. key는 DB/URL에 쓰는 값, value는 화면에 보일 이름.
# 프론트(src/data/textCategories.js)와 같은 목록이어야 해요.
TEXT_CATEGORIES = {
    "poem": "시",
    "quote": "명언",
    "novel": "소설",
    "webnovel": "웹소설",
    "essay": "수필",
    "glitter": "글리터",  # 글리터 사용자들이 직접 지은 글
}


class TypingText(Base):
    __tablename__ = "typing_texts"

    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[str] = mapped_column(String(20), index=True)  # 분류별로 자주 조회해서 인덱스
    title: Mapped[str] = mapped_column(String(100))  # 원작 제목 (명언이면 비워도 됨)
    author: Mapped[str] = mapped_column(String(50))  # 원작자 (모르면 비워도 됨)
    content: Mapped[str] = mapped_column(Text)

    # 등록한 회원. 기본 제공 글은 None.
    # ondelete="SET NULL": 회원이 탈퇴해도 그 사람이 올린 글은 남겨두고 "등록자 없음"으로만 바꿔요.
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user: Mapped["User | None"] = relationship()

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

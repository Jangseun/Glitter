"""커뮤니티: 공개 작품의 좋아요 / 댓글 테이블."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkLike(Base):
    """좋아요 한 번 = 행 하나.

    (user_id, work_id) 두 컬럼을 합쳐서 기본 키(복합 기본 키)로 써요.
    → 같은 사람이 같은 작품에 좋아요를 두 번 누르면 DB가 "이미 있음"으로 막아줘요.
    좋아요 수는 이 테이블에서 work_id로 세기만 하면 돼요. (COUNT)
    """

    __tablename__ = "work_likes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # works.id가 문자열(UUID)이라 여기도 문자열이에요
    work_id: Mapped[str] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 작품이 지워지면 댓글도, 회원이 탈퇴하면 그 사람 댓글도 같이 지워져요 (CASCADE)
    work_id: Mapped[str] = mapped_column(ForeignKey("works.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


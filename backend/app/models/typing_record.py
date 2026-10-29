"""타자 기록 테이블. 로그인한 사람이 한 판을 끝낼 때마다 한 줄씩 쌓여요. (성장 그래프용)"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TypingRecord(Base):
    __tablename__ = "typing_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # 어떤 글을 쳤는지. 글이 삭제돼도 기록은 남도록 SET NULL
    text_id: Mapped[int | None] = mapped_column(ForeignKey("typing_texts.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 시/소설 등 (분류별 통계용)
    mode: Mapped[str] = mapped_column(String(10))  # "solo" = 혼자 연습 / "battle" = 친구 대결

    speed: Mapped[int] = mapped_column(Integer)  # 타/분
    accuracy: Mapped[float] = mapped_column(Float)  # %
    typo_count: Mapped[int] = mapped_column(Integer)
    seconds: Mapped[float] = mapped_column(Float)
    char_count: Mapped[int] = mapped_column(Integer)  # 친 글자 수 (총 연습량 계산용)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

"""개인 소재함 테이블. 회원이 마음에 든 랜덤 소재(또는 직접 만든 소재)를 저장해 둬요."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SavedPrompt(Base):
    __tablename__ = "saved_prompts"

    id: Mapped[int] = mapped_column(primary_key=True)
    # 회원이 탈퇴하면 소재함도 같이 지워져요 (CASCADE)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # 소재 내용. 작품(works.prompt)과 같은 모양 → { "genre": "추리", "word": "붕어빵", ... }
    prompt: Mapped[dict] = mapped_column(JSON)
    # 짧은 메모 (예: "주인공 이름은 지수로") — 없으면 빈 문자열
    memo: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

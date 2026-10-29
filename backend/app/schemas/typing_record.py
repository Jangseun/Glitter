"""타자 기록 API의 요청/응답 모양."""

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.work import CamelModel


class TypingRecordCreate(CamelModel):
    # 값 범위를 정해서, 이상한 값(음수, 말도 안 되게 큰 타수)이 기록되지 않게 해요.
    mode: Literal["solo", "battle"]
    text_id: int | None = None
    category: str | None = Field(default=None, max_length=20)
    speed: int = Field(ge=0, le=3000)
    accuracy: float = Field(ge=0, le=100)
    typo_count: int = Field(ge=0, le=10000)
    seconds: float = Field(ge=0, le=3600)
    char_count: int = Field(ge=1, le=1000)


class TypingRecordRead(CamelModel):
    id: int
    mode: str
    category: str | None
    speed: int
    accuracy: float
    typo_count: int
    seconds: float
    char_count: int
    created_at: datetime


class TypingSummary(CamelModel):
    """프로필 화면 맨 위의 요약 숫자들"""

    total_count: int  # 총 연습 횟수
    total_chars: int  # 총 친 글자 수
    total_seconds: float  # 총 연습 시간
    best_speed: int  # 최고 타수
    recent_speed: float  # 최근 10판 평균 타수
    recent_accuracy: float  # 최근 10판 평균 정확도

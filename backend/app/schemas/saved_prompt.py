"""개인 소재함 API의 요청/응답 모양."""

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.work import CamelModel

# 소재 항목 key. 프론트 src/data/storyPrompts.js의 STORY_PROMPT_CATEGORIES와 같아야 해요.
PROMPT_KEYS = {"genre", "place", "character", "theme", "word"}


class SavedPromptCreate(CamelModel):
    prompt: dict[str, str]
    memo: str = Field(default="", max_length=100)

    @field_validator("prompt")
    @classmethod
    def check_prompt(cls, value: dict[str, str]) -> dict[str, str]:
        # 알 수 없는 항목은 버리고, 앞뒤 공백 정리, 빈 값은 제외
        cleaned = {k: v.strip()[:50] for k, v in value.items() if k in PROMPT_KEYS and v.strip()}
        if not cleaned:
            raise ValueError("소재를 한 가지 이상 넣어주세요.")
        return cleaned

    @field_validator("memo")
    @classmethod
    def strip_memo(cls, value: str) -> str:
        return value.strip()


class SavedPromptRead(CamelModel):
    id: int
    prompt: dict[str, str]
    memo: str
    created_at: datetime

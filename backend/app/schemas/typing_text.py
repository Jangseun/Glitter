"""타자 연습 글 API의 요청/응답 모양."""

from typing import Literal

from pydantic import Field, field_validator

from app.schemas.work import CamelModel

# 글 분류 (조회/등록 공통). "glitter" = 글리터 사용자들이 직접 지은 글
Category = Literal["poem", "quote", "novel", "webnovel", "essay", "glitter"]


class TypingTextCreate(CamelModel):
    category: Category
    title: str = Field(default="", max_length=100)
    author: str = Field(default="", max_length=50)
    content: str = Field(min_length=5, max_length=500)

    # field_validator: 값이 들어올 때 자동으로 한 번 손질하는 함수.
    # 타자 연습 화면은 한 줄짜리 글이라 Enter(줄바꿈)를 칠 수 없어요.
    # 그래서 줄바꿈/탭/여러 칸 공백을 전부 공백 한 칸으로 바꿔서 저장해요.
    @field_validator("content")
    @classmethod
    def normalize_content(cls, value: str) -> str:
        value = " ".join(value.split())  # split()은 모든 공백 문자 기준으로 나눠서 빈 칸을 없애줘요
        if len(value) < 5:
            raise ValueError("글이 너무 짧아요. (5자 이상)")
        return value

    @field_validator("title", "author")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()


class TypingTextRead(CamelModel):
    id: int
    category: str
    title: str
    author: str
    content: str
    user_id: int | None  # 프론트에서 "내가 올린 글"인지(삭제 버튼 표시) 판단할 때 써요
    uploader: str | None  # 등록한 사람 닉네임 (기본 제공 글이면 null)

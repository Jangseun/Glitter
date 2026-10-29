"""커뮤니티 API의 요청/응답 모양."""

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.work import CamelModel


class CommunityWorkSummary(CamelModel):
    """목록 카드에 보여줄 정보 (본문은 앞부분만)"""

    id: str
    title: str
    excerpt: str
    mode: str
    authors: list[str]  # 이어쓰기 참여자 (혼자 쓰기면 빈 목록)
    prompt: dict[str, str] | None
    owner_id: int
    owner_nickname: str  # 작품을 올린 사람
    like_count: int
    comment_count: int
    published_at: datetime | None


class CommunityWorkDetail(CommunityWorkSummary):
    body: str
    created_at: datetime
    liked_by_me: bool  # 로그인 안 했으면 항상 false
    is_public: bool  # 주인은 비공개 상태에서도 미리 볼 수 있어서 같이 알려줘요


class LikeResult(CamelModel):
    liked: bool
    like_count: int


class CommentCreate(CamelModel):
    body: str = Field(min_length=1, max_length=500)

    @field_validator("body")
    @classmethod
    def strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("댓글 내용을 입력해주세요.")
        return value


class CommentRead(CamelModel):
    id: int
    body: str
    user_id: int
    nickname: str
    created_at: datetime

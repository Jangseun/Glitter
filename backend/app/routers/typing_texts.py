"""타자 연습 글 API.

GET    /api/texts?category=poem          분류별 글 목록 (category 없으면 전체)
GET    /api/texts/random?category=poem   무작위 한 개 (exclude=글번호 로 직전 글 제외 가능)
POST   /api/texts                        글 등록 (로그인 필요)
DELETE /api/texts/{text_id}              내가 등록한 글 삭제 (로그인 필요)

목록/연습은 로그인 없이도 돼요. (타자 연습은 누구나 할 수 있게)
"""

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.auth import CurrentUser
from app.database import DbSession
from app.models import TypingText
from app.schemas.typing_text import Category, TypingTextCreate, TypingTextRead

router = APIRouter(prefix="/api/texts", tags=["texts"])


def to_read(text: TypingText) -> TypingTextRead:
    """DB 객체 → 응답. uploader(닉네임)는 관계(text.user)를 따라가서 꺼내요."""
    return TypingTextRead(
        id=text.id,
        category=text.category,
        title=text.title,
        author=text.author,
        content=text.content,
        user_id=text.user_id,
        uploader=text.user.nickname if text.user else None,
    )


@router.get("", response_model=list[TypingTextRead])
def list_texts(db: DbSession, category: Category | None = None):
    query = select(TypingText).order_by(TypingText.id)
    if category:
        query = query.where(TypingText.category == category)
    return [to_read(t) for t in db.scalars(query).all()]


# ⚠️ "/random"은 "/{text_id}"류 경로보다 위에 있어야 해요.
# (지금은 GET /{text_id}가 없지만, 나중에 추가하면 "random"이 id로 잘못 해석될 수 있어서 순서 주의)
@router.get("/random", response_model=TypingTextRead)
def random_text(db: DbSession, category: Category | None = None, exclude: int | None = Query(default=None)):
    query = select(TypingText)
    if category:
        query = query.where(TypingText.category == category)
    if exclude is not None:
        query = query.where(TypingText.id != exclude)
    # ORDER BY random() LIMIT 1: DB가 무작위로 섞어서 하나만 줘요.
    # 글이 수만 개가 되면 느려지는 방식이지만, 이 규모에선 가장 간단하고 충분해요.
    text = db.scalar(query.order_by(func.random()).limit(1))
    if text is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이 분류에는 아직 글이 없어요.")
    return to_read(text)


@router.post("", response_model=TypingTextRead, status_code=status.HTTP_201_CREATED)
def create_text(data: TypingTextCreate, db: DbSession, user: CurrentUser):
    text = TypingText(**data.model_dump(), user_id=user.id)
    db.add(text)
    db.commit()
    db.refresh(text)
    return to_read(text)


@router.delete("/{text_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_text(text_id: int, db: DbSession, user: CurrentUser):
    text = db.get(TypingText, text_id)
    # 기본 제공 글(user_id 없음)이나 남이 올린 글은 지울 수 없어요.
    if text is None or text.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="글을 찾을 수 없어요.")
    db.delete(text)
    db.commit()

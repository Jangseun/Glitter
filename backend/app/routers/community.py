"""커뮤니티 API. 공개된 작품은 로그인 없이도 읽을 수 있고, 좋아요/댓글은 로그인이 필요해요.

GET    /api/community/works?sort=latest|popular&offset=0   공개 작품 목록
GET    /api/community/works/{work_id}                      공개 작품 읽기 (주인은 비공개도 미리보기 가능)
POST   /api/community/works/{work_id}/like                 좋아요
DELETE /api/community/works/{work_id}/like                 좋아요 취소
GET    /api/community/works/{work_id}/comments             댓글 목록
POST   /api/community/works/{work_id}/comments             댓글 쓰기
DELETE /api/community/comments/{comment_id}                댓글 삭제 (댓글 쓴 사람 또는 작품 주인)
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.auth import CurrentUser, OptionalUser
from app.database import DbSession
from app.models import Comment, User, Work, WorkLike
from app.schemas.community import CommentCreate, CommentRead, CommunityWorkDetail, CommunityWorkSummary, LikeResult

router = APIRouter(prefix="/api/community", tags=["community"])

PAGE_SIZE = 20
EXCERPT_LENGTH = 120

# [스칼라 서브쿼리]
# 작품 한 줄마다 "좋아요 몇 개 / 댓글 몇 개"를 같이 가져오고 싶을 때,
# SELECT 안에 작은 SELECT를 넣는 방식이에요. (correlate: 바깥 쿼리의 Work.id와 연결)
#   SELECT works.*, (SELECT count(*) FROM work_likes WHERE work_likes.work_id = works.id) AS like_count ...
like_count_sq = (
    select(func.count()).select_from(WorkLike).where(WorkLike.work_id == Work.id).correlate(Work).scalar_subquery()
)
comment_count_sq = (
    select(func.count()).select_from(Comment).where(Comment.work_id == Work.id).correlate(Work).scalar_subquery()
)


def to_summary(work: Work, owner: User, like_count: int, comment_count: int) -> dict:
    """DB 결과 → 응답용 dict (Pydantic이 CamelCase로 바꿔서 보내줘요)"""
    excerpt = work.body[:EXCERPT_LENGTH] + ("…" if len(work.body) > EXCERPT_LENGTH else "")
    return {
        "id": work.id,
        "title": work.title,
        "excerpt": excerpt,
        "mode": work.mode,
        "authors": work.authors,
        "prompt": work.prompt,
        "owner_id": owner.id,
        "owner_nickname": owner.nickname,
        "like_count": like_count,
        "comment_count": comment_count,
        "published_at": work.published_at,
    }


@router.get("/works", response_model=list[CommunityWorkSummary])
def list_public_works(
    db: DbSession,
    sort: Literal["latest", "popular"] = "latest",
    offset: int = Query(default=0, ge=0),
):
    # 작품 + 주인(회원) + 좋아요 수 + 댓글 수를 한 번의 쿼리로 가져와요.
    # join(User, ...): works.user_id = users.id 로 두 테이블을 붙여서 주인 닉네임을 같이 읽어요.
    query = (
        select(Work, User, like_count_sq.label("likes"), comment_count_sq.label("comments"))
        .join(User, Work.user_id == User.id)
        .where(Work.is_public.is_(True))
    )
    if sort == "popular":
        query = query.order_by(like_count_sq.desc(), Work.published_at.desc())
    else:
        query = query.order_by(Work.published_at.desc())

    # offset/limit: "앞에서 offset개 건너뛰고 PAGE_SIZE개만" → 더 보기(페이지 나누기)에 써요
    rows = db.execute(query.offset(offset).limit(PAGE_SIZE)).all()
    return [to_summary(work, owner, likes, comments) for work, owner, likes, comments in rows]


def get_readable_work(db: DbSession, work_id: str, user: User | None) -> Work:
    """공개 작품이거나, 내 작품이면 읽을 수 있어요. 그 외엔 "없음"으로 답해요."""
    work = db.get(Work, work_id)
    if work is None or work.user_id is None or not (work.is_public or (user and work.user_id == user.id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="작품을 찾을 수 없어요.")
    return work


def get_public_work(db: DbSession, work_id: str) -> Work:
    """좋아요/댓글은 공개 작품에만 달 수 있어요."""
    work = db.get(Work, work_id)
    if work is None or not work.is_public:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공개된 작품이 아니에요.")
    return work


def count_likes(db: DbSession, work_id: str) -> int:
    return db.scalar(select(func.count()).select_from(WorkLike).where(WorkLike.work_id == work_id))


@router.get("/works/{work_id}", response_model=CommunityWorkDetail)
def read_public_work(work_id: str, db: DbSession, user: OptionalUser):
    work = get_readable_work(db, work_id, user)
    comments = db.scalar(select(func.count()).select_from(Comment).where(Comment.work_id == work_id))
    # db.get(모델, 기본키): 복합 기본 키는 (user_id, work_id) 튜플로 찾아요
    liked = bool(user and db.get(WorkLike, (user.id, work_id)))
    return {
        **to_summary(work, work.user, count_likes(db, work_id), comments),
        "body": work.body,
        "created_at": work.created_at,
        "liked_by_me": liked,
        "is_public": work.is_public,
    }


@router.post("/works/{work_id}/like", response_model=LikeResult)
def like_work(work_id: str, db: DbSession, user: CurrentUser):
    get_public_work(db, work_id)
    # 이미 눌렀으면 그대로 두고(두 번 눌러도 1개), 아니면 추가
    if db.get(WorkLike, (user.id, work_id)) is None:
        db.add(WorkLike(user_id=user.id, work_id=work_id))
        db.commit()
    return {"liked": True, "like_count": count_likes(db, work_id)}


@router.delete("/works/{work_id}/like", response_model=LikeResult)
def unlike_work(work_id: str, db: DbSession, user: CurrentUser):
    get_public_work(db, work_id)
    like = db.get(WorkLike, (user.id, work_id))
    if like is not None:
        db.delete(like)
        db.commit()
    return {"liked": False, "like_count": count_likes(db, work_id)}


@router.get("/works/{work_id}/comments", response_model=list[CommentRead])
def list_comments(work_id: str, db: DbSession, user: OptionalUser):
    get_readable_work(db, work_id, user)
    rows = db.execute(
        select(Comment, User.nickname)
        .join(User, Comment.user_id == User.id)
        .where(Comment.work_id == work_id)
        .order_by(Comment.created_at)  # 오래된 댓글이 위로 (대화 순서대로)
    ).all()
    return [
        {"id": c.id, "body": c.body, "user_id": c.user_id, "nickname": nickname, "created_at": c.created_at}
        for c, nickname in rows
    ]


@router.post("/works/{work_id}/comments", response_model=CommentRead, status_code=status.HTTP_201_CREATED)
def create_comment(work_id: str, data: CommentCreate, db: DbSession, user: CurrentUser):
    get_public_work(db, work_id)
    comment = Comment(work_id=work_id, user_id=user.id, body=data.body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id,
        "body": comment.body,
        "user_id": user.id,
        "nickname": user.nickname,
        "created_at": comment.created_at,
    }


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: DbSession, user: CurrentUser):
    comment = db.get(Comment, comment_id)
    # 지울 수 있는 사람: 댓글을 쓴 사람, 또는 그 작품의 주인 (내 글에 달린 악플은 내가 지울 수 있게)
    work_owner_id = db.scalar(select(Work.user_id).where(Work.id == comment.work_id)) if comment else None
    if comment is None or user.id not in (comment.user_id, work_owner_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없어요.")
    db.delete(comment)
    db.commit()

"""타자 기록 API (전부 로그인 필요, 내 기록만)

POST /api/typing-records          한 판 끝났을 때 기록 저장
GET  /api/typing-records?limit=50 최근 기록 (최신순) → 성장 그래프
GET  /api/typing-records/summary  요약 (총 횟수, 최고 타수, 최근 평균 등)
"""

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.auth import CurrentUser
from app.database import DbSession
from app.models import TypingRecord
from app.schemas.typing_record import TypingRecordCreate, TypingRecordRead, TypingSummary

router = APIRouter(prefix="/api/typing-records", tags=["typing-records"])

RECENT_COUNT = 10  # "최근 평균"을 몇 판 기준으로 낼지


@router.post("", response_model=TypingRecordRead, status_code=status.HTTP_201_CREATED)
def create_record(data: TypingRecordCreate, db: DbSession, user: CurrentUser):
    record = TypingRecord(**data.model_dump(), user_id=user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[TypingRecordRead])
def list_records(db: DbSession, user: CurrentUser, limit: int = Query(default=50, ge=1, le=200)):
    query = (
        select(TypingRecord)
        .where(TypingRecord.user_id == user.id)
        # 같은 초에 저장된 기록끼리는 순서가 섞일 수 있어서 id(저장 순서)로 한 번 더 정렬
        .order_by(TypingRecord.created_at.desc(), TypingRecord.id.desc())
        .limit(limit)
    )
    return db.scalars(query).all()


@router.get("/summary", response_model=TypingSummary)
def summary(db: DbSession, user: CurrentUser):
    mine = TypingRecord.user_id == user.id

    # 전체 기록에 대한 집계: count/sum/max를 DB가 한 번에 계산해서 한 줄로 돌려줘요.
    # coalesce(x, 0): 기록이 하나도 없으면 sum/max가 NULL이라 0으로 바꿔요.
    total_count, total_chars, total_seconds, best_speed = db.execute(
        select(
            func.count(TypingRecord.id),
            func.coalesce(func.sum(TypingRecord.char_count), 0),
            func.coalesce(func.sum(TypingRecord.seconds), 0),
            func.coalesce(func.max(TypingRecord.speed), 0),
        ).where(mine)
    ).one()

    # 최근 N판 평균: 먼저 최근 N개만 고르는 서브쿼리를 만들고, 그 안에서 평균을 내요.
    recent = select(TypingRecord.speed, TypingRecord.accuracy).where(mine).order_by(TypingRecord.created_at.desc(), TypingRecord.id.desc()).limit(RECENT_COUNT).subquery()
    recent_speed, recent_accuracy = db.execute(
        select(func.coalesce(func.avg(recent.c.speed), 0), func.coalesce(func.avg(recent.c.accuracy), 0))
    ).one()

    return {
        "total_count": total_count,
        "total_chars": total_chars,
        "total_seconds": round(float(total_seconds), 1),
        "best_speed": best_speed,
        "recent_speed": round(float(recent_speed), 1),
        "recent_accuracy": round(float(recent_accuracy), 1),
    }

"""작품 API.

GET    /api/works            작품 목록 (최신순)
GET    /api/works/{work_id}  작품 하나
POST   /api/works            작품 저장
PATCH  /api/works/{work_id}  작품 수정 (보낸 필드만)
DELETE /api/works/{work_id}  작품 삭제
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.database import DbSession
from app.models import Work
from app.schemas.work import WorkCreate, WorkRead, WorkUpdate

router = APIRouter(prefix="/api/works", tags=["works"])


def get_work_or_404(db: DbSession, work_id: str) -> Work:
    # db.get(): 기본 키(id)로 한 행을 찾아요. 없으면 None
    work = db.get(Work, work_id)
    if work is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="작품을 찾을 수 없어요.")
    return work


# response_model: 돌려주는 SQLAlchemy 객체를 WorkRead 모양의 JSON으로 바꿔줘요. (camelCase 포함)
@router.get("", response_model=list[WorkRead])
def list_works(db: DbSession):
    # select(Work) = SELECT * FROM works / db.scalars(...).all() = 결과를 Work 객체 리스트로
    return db.scalars(select(Work).order_by(Work.created_at.desc())).all()


@router.get("/{work_id}", response_model=WorkRead)
def read_work(work_id: str, db: DbSession):
    return get_work_or_404(db, work_id)


@router.post("", response_model=WorkRead, status_code=status.HTTP_201_CREATED)
def create_work(data: WorkCreate, db: DbSession):
    # model_dump(): Pydantic 객체 → 파이썬 dict (필드 이름은 snake_case)
    # **dict: dict를 풀어서 Work(title=..., body=..., ...)처럼 넘겨요.
    work = Work(**data.model_dump())
    db.add(work)
    db.commit()  # 이 순간 실제로 INSERT가 실행돼요
    # created_at은 DB가 채운 값(server_default)이라 파이썬 객체엔 아직 없어요.
    # refresh로 DB에서 방금 저장된 행을 다시 읽어와 채워줘요.
    db.refresh(work)
    return work


# PUT이 아니라 PATCH를 쓰는 이유:
# PUT은 "작품 전체를 이걸로 통째로 교체", PATCH는 "보낸 부분만 고치기"라는 뜻이에요.
# 제목/본문만 고치고 mode, authors, prompt는 그대로 두니까 PATCH가 맞아요.
@router.patch("/{work_id}", response_model=WorkRead)
def update_work(work_id: str, data: WorkUpdate, db: DbSession):
    work = get_work_or_404(db, work_id)

    # exclude_none=True: 값이 None인 필드(=안 보낸 필드)는 빼고 dict로 만들어요.
    # 예) {"title": "새 제목"}만 보냈으면 → {"title": "새 제목"}
    changes = data.model_dump(exclude_none=True)
    for field, value in changes.items():
        setattr(work, field, value)  # work.title = "새 제목" 과 같은 뜻

    if changes:
        db.commit()  # UPDATE 실행 (이때 updated_at도 onupdate로 자동 갱신)
        db.refresh(work)  # DB가 채운 updated_at 값을 다시 읽어오기
    return work


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work(work_id: str, db: DbSession):
    work = get_work_or_404(db, work_id)
    db.delete(work)
    db.commit()
    # 204 No Content: 성공했고 돌려줄 내용은 없다는 뜻이라 아무것도 return하지 않아요.

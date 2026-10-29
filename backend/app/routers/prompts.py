"""개인 소재함 API (전부 로그인 필요, 내 소재만)

GET    /api/prompts              내 소재 목록 (최신순)
POST   /api/prompts              소재 저장
DELETE /api/prompts/{prompt_id}  소재 삭제
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.auth import CurrentUser
from app.database import DbSession
from app.models import SavedPrompt
from app.schemas.saved_prompt import SavedPromptCreate, SavedPromptRead

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

# 소재함이 끝없이 커지지 않게 한 사람당 최대 개수
MAX_PROMPTS_PER_USER = 200


@router.get("", response_model=list[SavedPromptRead])
def list_prompts(db: DbSession, user: CurrentUser):
    query = select(SavedPrompt).where(SavedPrompt.user_id == user.id).order_by(SavedPrompt.created_at.desc())
    return db.scalars(query).all()


@router.post("", response_model=SavedPromptRead, status_code=status.HTTP_201_CREATED)
def create_prompt(data: SavedPromptCreate, db: DbSession, user: CurrentUser):
    # SELECT count(*) FROM saved_prompts WHERE user_id = 내 번호
    count = db.scalar(select(func.count()).select_from(SavedPrompt).where(SavedPrompt.user_id == user.id))
    if count >= MAX_PROMPTS_PER_USER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"소재함은 {MAX_PROMPTS_PER_USER}개까지 저장할 수 있어요.")

    saved = SavedPrompt(prompt=data.prompt, memo=data.memo, user_id=user.id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt(prompt_id: int, db: DbSession, user: CurrentUser):
    saved = db.get(SavedPrompt, prompt_id)
    if saved is None or saved.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="소재를 찾을 수 없어요.")
    db.delete(saved)
    db.commit()

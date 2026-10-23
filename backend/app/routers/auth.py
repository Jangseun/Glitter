"""회원가입 / 로그인 API.

POST /api/auth/signup  회원가입 → 바로 로그인된 상태로 토큰을 줘요
POST /api/auth/login   로그인 → 토큰
GET  /api/auth/me      지금 토큰의 주인 정보 (프론트가 새로고침 후 로그인 상태를 복구할 때)
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth import CurrentUser, create_access_token, hash_password, verify_password
from app.database import DbSession
from app.models import User
from app.schemas.user import AuthResponse, UserCreate, UserLogin, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


def auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: DbSession):
    if db.scalar(select(User).where(User.username == data.username)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 아이디예요.")

    user = User(username=data.username, nickname=data.nickname.strip(), password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(data: UserLogin, db: DbSession):
    user = db.scalar(select(User).where(User.username == data.username.strip().lower()))
    # 아이디가 없는 경우와 비밀번호가 틀린 경우를 "같은 메시지"로 답해요.
    # 따로 알려주면, 남의 아이디가 가입돼 있는지를 알아내는 데 악용될 수 있어서예요.
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않아요.")
    return auth_response(user)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser):
    return user

"""회원가입 / 로그인 API.

POST   /api/auth/signup    회원가입 → 바로 로그인된 상태로 토큰을 줘요
POST   /api/auth/login     로그인 → 토큰
GET    /api/auth/me        지금 토큰의 주인 정보 (프론트가 새로고침 후 로그인 상태를 복구할 때)
PATCH  /api/auth/me        닉네임 변경
PUT    /api/auth/password  비밀번호 변경
DELETE /api/auth/me        회원 탈퇴 (작품/소재함/기록/댓글/좋아요도 같이 삭제, 등록한 타자 글은 남음)
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth import CurrentUser, create_access_token, hash_password, verify_password
from app.database import DbSession
from app.models import User
from app.schemas.user import AccountDelete, AuthResponse, PasswordChange, ProfileUpdate, UserCreate, UserLogin, UserRead

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


WRONG_PASSWORD = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비밀번호가 올바르지 않아요.")


@router.patch("/me", response_model=UserRead)
def update_profile(data: ProfileUpdate, db: DbSession, user: CurrentUser):
    nickname = data.nickname.strip()
    if not nickname:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="닉네임을 입력해주세요.")
    user.nickname = nickname
    db.commit()
    db.refresh(user)
    return user


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, db: DbSession, user: CurrentUser):
    # 로그인 상태라도 "지금 비밀번호"를 한 번 더 확인해요.
    # (잠깐 자리 비운 사이 누군가 내 컴퓨터로 비밀번호를 바꿔버리는 걸 막기 위해)
    if not verify_password(data.current_password, user.password_hash):
        raise WRONG_PASSWORD
    user.password_hash = hash_password(data.new_password)
    db.commit()


# DELETE 요청에 본문(body)을 담는 건 흔하진 않지만 HTTP상 허용돼요. 비밀번호 확인용이에요.
@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: AccountDelete, db: DbSession, user: CurrentUser):
    if not verify_password(data.password, user.password_hash):
        raise WRONG_PASSWORD
    # 회원 행을 지우면, 외래 키의 ondelete 설정에 따라 DB가 나머지를 정리해요.
    #   CASCADE  → 작품, 소재함, 타자 기록, 댓글, 좋아요 같이 삭제
    #   SET NULL → 이 사람이 등록한 타자 연습 글은 남기고 "등록자 없음"으로
    db.delete(user)
    db.commit()

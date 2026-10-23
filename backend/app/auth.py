"""로그인 관련 도구: 비밀번호 해시, JWT 토큰 발급/검사, "지금 로그인한 회원" 꺼내기.

[전체 흐름]
1) 회원가입/로그인 성공 → 서버가 JWT 토큰(긴 문자열)을 만들어서 프론트에 줘요.
2) 프론트는 토큰을 저장해두고, 이후 요청마다 헤더에 붙여서 보내요.
     Authorization: Bearer <토큰>
3) 서버는 토큰의 서명을 검사해서 "누가 보낸 요청인지" 알아내요. (DB에 세션을 저장할 필요 없음)

[JWT란?]
"이 사람은 3번 회원이고, 언제까지 유효함" 같은 정보 + 서버만 아는 비밀 키로 만든 서명을 합친 문자열이에요.
내용은 누구나 읽을 수 있지만(암호화 X), 비밀 키 없이는 서명을 만들 수 없어서 위조가 불가능해요.
그래서 토큰에 비밀번호 같은 민감한 정보는 넣지 않아요. (회원 번호만 넣음)
"""

from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from app.config import settings
from app.database import DbSession
from app.models import User

ALGORITHM = "HS256"

# 비밀번호 해시 도구. recommended() = 현재 권장 알고리즘(Argon2)
# 같은 비밀번호라도 매번 다른 해시가 나오고(salt), 해시에서 원래 비밀번호를 되돌릴 수 없어요.
password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_expire_days)
    # sub(subject) = 토큰 주인, exp(expiration) = 만료 시각. JWT 표준 필드 이름이에요.
    # sub는 표준상 문자열이어야 해서 str()로 바꿔 넣어요.
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


# 요청 헤더에서 "Authorization: Bearer <토큰>"을 꺼내주는 FastAPI 도구.
# auto_error=False: 헤더가 없어도 바로 에러 내지 말고 None을 줘요. (로그인 선택인 API에서도 쓰려고)
bearer_scheme = HTTPBearer(auto_error=False)

UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="로그인이 필요해요.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_optional_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User | None:
    """로그인했으면 그 회원을, 안 했거나 토큰이 이상하면 None을 돌려줘요."""
    if credentials is None:
        return None
    try:
        # 서명이 맞는지 + 만료되지 않았는지 검사. 하나라도 틀리면 예외가 나요.
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    # 토큰은 멀쩡해도 그 사이 탈퇴한 회원일 수 있으니 DB에서 한 번 더 확인
    return db.get(User, user_id)


def get_current_user(user: Annotated[User | None, Depends(get_optional_user)]) -> User:
    """로그인이 "꼭" 필요한 API용. 로그인 안 했으면 401 에러."""
    if user is None:
        raise UNAUTHORIZED
    return user


# API 함수 인자에 `user: CurrentUser` 라고만 쓰면 로그인한 회원이 들어와요. (안 했으면 자동으로 401)
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]

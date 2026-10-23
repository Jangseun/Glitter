"""회원/로그인 API의 요청·응답 모양."""

from pydantic import Field

from app.schemas.work import CamelModel


class UserCreate(CamelModel):
    """회원가입 요청"""

    # 아이디: 영어 소문자/숫자/밑줄만, 4~20자 (pattern = 정규식으로 형식 검사)
    username: str = Field(min_length=4, max_length=20, pattern=r"^[a-z0-9_]+$")
    # 비밀번호 최소 8자. 너무 긴 입력으로 서버를 괴롭히지 못하게 최대 길이도 둬요.
    password: str = Field(min_length=8, max_length=128)
    nickname: str = Field(min_length=1, max_length=12)


class UserLogin(CamelModel):
    username: str
    password: str


class UserRead(CamelModel):
    """프론트에 보내는 회원 정보. password_hash는 절대 포함하지 않아요."""

    id: int
    username: str
    nickname: str


class AuthResponse(CamelModel):
    """로그인/회원가입 성공 응답 → { "accessToken": "...", "user": {...} }"""

    access_token: str
    user: UserRead

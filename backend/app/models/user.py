"""회원 테이블."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# 순환 import 방지: 타입 검사할 때만 import해요. (실행 중에는 문자열 "Work"로 연결)
if TYPE_CHECKING:
    from app.models.work import Work


class User(Base):
    __tablename__ = "users"

    # 회원 번호는 그냥 1, 2, 3... 자동 증가 숫자로 충분해요. (밖으로 노출되는 주소에 안 쓰여서)
    id: Mapped[int] = mapped_column(primary_key=True)

    # 로그인 아이디. unique=True → 같은 아이디로 두 번 가입하면 DB가 막아줘요.
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    # 화면에 보이는 이름 (작품 작성자, 친구 방 닉네임 기본값)
    nickname: Mapped[str] = mapped_column(String(12))

    # ⚠️ 비밀번호 "원문"은 절대 저장하지 않아요. 되돌릴 수 없게 변환한 해시값만 저장하고,
    # 로그인할 때는 입력한 비밀번호를 같은 방식으로 변환해서 비교해요. (app/auth.py 참고)
    password_hash: Mapped[str] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # [SQLAlchemy 관계(relationship)]
    # DB 컬럼이 아니라 "파이썬에서 편하게 쓰기 위한 연결"이에요.
    #   user.works      → 이 회원이 쓴 작품 목록
    #   work.user       → 이 작품을 쓴 회원
    # back_populates로 양쪽을 짝지어 두면, 한쪽을 바꿨을 때 다른 쪽도 맞춰져요.
    # 실제 연결 정보는 works 테이블의 user_id 컬럼(외래 키)에 저장돼요.
    works: Mapped[list["Work"]] = relationship(back_populates="user")

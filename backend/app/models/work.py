"""작품(완성된 이야기) 테이블."""

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Work(Base):
    __tablename__ = "works"

    # 숫자 1, 2, 3... 대신 UUID 문자열을 ID로 써요.
    # 작품 주소(/works/{id})를 공유할 때 다른 작품 번호를 쉽게 추측할 수 없게 하려는 것.
    # default에 함수(lambda)를 넘겨야 행을 만들 때마다 새로 생성돼요. (값을 넘기면 모든 행이 같은 ID가 됨)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    title: Mapped[str] = mapped_column(String(100))
    body: Mapped[str] = mapped_column(Text)  # 길이 제한 없는 긴 문자열

    # "solo"(혼자 쓰기) 또는 "relay"(함께 이어쓰기)
    mode: Mapped[str] = mapped_column(String(10), default="solo")

    # 작성자 닉네임 목록. 예: ["민지", "승원"]
    # 아직 회원(users) 테이블이 없어서 닉네임 문자열을 JSON 배열로 그대로 저장해요.
    # 나중에 로그인을 붙이면 users 테이블 + 관계(relationship)로 바꿀 수 있어요.
    authors: Mapped[list[str]] = mapped_column(JSON, default=list)

    # 랜덤 소재. 예: {"genre": "추리", "word": "붕어빵"} / 자유 주제면 None(NULL)
    # 소재 항목(장르, 장소...)이 바뀌어도 테이블 구조를 안 바꿔도 되게 JSON으로 통째로 저장해요.
    prompt: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # server_default=func.now(): 시간을 파이썬이 아니라 DB가 INSERT 순간에 직접 채워줘요.
    # timezone=True: 시간대 정보까지 저장 → 프론트에서 한국 시간으로 정확히 변환돼요.
    # index=True: 최신순 정렬(ORDER BY created_at)을 자주 하니까 인덱스를 걸어둬요.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

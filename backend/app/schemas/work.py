"""작품 API의 요청/응답 모양 정의 (Pydantic).

models/ 와 schemas/ 를 나누는 이유:
    models  = DB 테이블 구조 (SQLAlchemy)
    schemas = API로 주고받는 JSON 구조 (Pydantic)
둘이 비슷해 보이지만, 예를 들어 id/created_at은 서버가 만드는 값이라
"작성 요청(WorkCreate)"에는 없고 "응답(WorkRead)"에만 있어요.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """파이썬은 snake_case(created_at), 자바스크립트는 camelCase(createdAt)를 써요.
    이 클래스를 상속하면 JSON으로 주고받을 때 자동으로 camelCase로 바꿔줘요.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,  # created_at ↔ createdAt 자동 변환
        populate_by_name=True,  # 파이썬 코드 안에서는 created_at 이름으로도 값을 넣을 수 있게
        from_attributes=True,  # SQLAlchemy 모델 객체(work.title 같은 속성)를 바로 변환할 수 있게
    )


class WorkCreate(CamelModel):
    """POST /api/works 요청 본문. 여기 조건에 안 맞으면 FastAPI가 자동으로 422 에러를 돌려줘요."""

    title: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1)
    mode: Literal["solo", "relay"] = "solo"
    authors: list[str] = []
    prompt: dict[str, str] | None = None


class WorkRead(CamelModel):
    """작품 응답. 프론트에서는 { id, title, body, mode, authors, prompt, createdAt } 로 받아요."""

    id: str
    title: str
    body: str
    mode: str
    authors: list[str]
    prompt: dict[str, str] | None
    created_at: datetime

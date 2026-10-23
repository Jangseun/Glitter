"""DB 연결 설정 (SQLAlchemy 2.0).

전체 흐름:
    engine        : 실제 DB와의 연결을 관리하는 객체 (앱 전체에 하나)
    SessionLocal  : 요청 하나를 처리할 때 쓰는 "작업 단위(Session)"를 만들어주는 공장
    Base          : 모든 모델(테이블 클래스)이 상속받는 부모 클래스
    get_db        : API 함수에 Session을 하나 빌려주고, 요청이 끝나면 닫아주는 의존성 함수
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# pool_pre_ping=True: 커넥션을 쓰기 직전에 살아있는지 가볍게 확인해요.
# DB를 재시작했거나 오래 놀던 연결이 끊겼을 때 "connection closed" 에러가 나는 걸 막아줘요.
#
# connect_timeout=5: DB에 접속이 안 될 때(Docker가 꺼져 있거나 재시작 중) 최대 5초만 기다리고 에러를 내요.
# 이게 없으면 접속을 끝없이 기다려서, 요청이 응답 없이 멈춘 것처럼 보이고 서버 전체가 먹통이 될 수 있어요.
# (PostgreSQL 전용 옵션이라 SQLite 등 다른 DB 주소일 땐 넣지 않아요)
connect_args = {"connect_timeout": 5} if settings.database_url.startswith("postgresql") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)

# autoflush=False: 쿼리할 때마다 변경사항을 자동으로 DB에 밀어넣지 않고, commit할 때 한 번에.
# expire_on_commit=False: commit 후에도 객체의 값을 그대로 읽을 수 있게.
#   (기본값 True면 commit 직후 work.title을 읽을 때 DB를 다시 조회해서 헷갈리기 쉬워요)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """모든 모델의 부모 클래스. 이걸 상속한 클래스는 Base.metadata에 테이블로 등록돼요.
    (Alembic이 이 metadata를 보고 migration을 만들어요)"""


def get_db():
    """요청 하나당 Session 하나를 만들어서 빌려주는 함수.

    yield 앞: 요청이 시작될 때 실행 → Session 생성
    yield   : API 함수에 Session을 넘겨줌
    finally : API 함수가 끝나면(에러가 나도) 반드시 Session을 닫음 → 커넥션 누수 방지
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# API 함수에서 `db: DbSession` 이라고만 쓰면 FastAPI가 알아서 get_db()를 호출해서 넣어줘요.
# 매번 `db: Session = Depends(get_db)`라고 길게 쓰지 않으려고 만든 별칭이에요.
DbSession = Annotated[Session, Depends(get_db)]

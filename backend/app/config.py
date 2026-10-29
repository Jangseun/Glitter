"""앱 설정값 모음.

DB 비밀번호 같은 값은 코드에 직접 쓰지 않고 backend/.env 파일에서 읽어와요.
(.env는 .gitignore에 들어있어서 GitHub에 올라가지 않음. 예시는 .env.example 참고)

pydantic-settings의 BaseSettings를 상속하면, 아래 필드 이름과 같은 환경변수를
자동으로 찾아서 넣어줘요. 대소문자는 구분하지 않아요.
    예) DATABASE_URL=...  →  settings.database_url
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env 의 "절대 경로".
# env_file=".env" 처럼 상대 경로로 쓰면 "명령을 실행한 폴더" 기준으로 찾기 때문에,
# backend 폴더가 아닌 곳(예: Glitter 루트)에서 uvicorn/alembic을 실행하면 .env를 못 찾아서
# "database_url Field required" 에러가 나요.
# 이 파일(app/config.py) 위치를 기준으로 두 단계 위 = backend 폴더라서, 어디서 실행해도 항상 같은 파일을 찾아요.
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # 기본값이 없으니 .env나 환경변수에 꼭 있어야 해요. 없으면 서버가 켜질 때 바로 에러가 나요.
    # (비밀번호를 코드에 기본값으로 박아두지 않기 위해 일부러 기본값을 안 줬어요)
    # 형식: postgresql+psycopg://사용자:비밀번호@호스트:포트/DB이름
    database_url: str

    # 로그인 토큰(JWT)에 "서명"할 때 쓰는 비밀 키. 이 값을 아는 사람은 아무 회원의 토큰이나 위조할 수 있어서
    # 절대 코드나 GitHub에 올리면 안 돼요. .env에만 넣어요. (기본값 없음 → 없으면 서버가 안 켜짐)
    jwt_secret: str
    # 로그인 유지 기간(일). 지나면 다시 로그인해야 해요.
    jwt_expire_days: int = 7

    # 이 주소에서 오는 요청만 허용(CORS). 개발 중엔 Vite 개발 서버 주소.
    # .env에서는 JSON 배열 형태로 적어요: CORS_ORIGINS=["http://localhost:5173"]
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        # .env에는 docker compose용 POSTGRES_USER 같은 값도 같이 들어있어요.
        # 여기 정의 안 된 값이 있어도 에러 내지 말고 무시하라는 설정.
        extra="ignore",
    )


# 앱 전체에서 이 객체 하나를 import해서 씁니다.
settings = Settings()

# Glitter Backend

FastAPI + SQLAlchemy 2.0 + Alembic + PostgreSQL

## 처음 한 번 세팅 (PowerShell, `backend` 폴더에서)

```powershell
# 1. 가상환경 만들고 패키지 설치
py -3.14 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. 환경변수 파일 만들기 → .env를 열어서 비밀번호(POSTGRES_PASSWORD, DATABASE_URL 둘 다) 바꾸기
Copy-Item .env.example .env

# 3. PostgreSQL 켜기 (Docker Desktop이 실행 중이어야 함)
docker compose up -d

# 4. 테이블 만들기 (migration 적용)
alembic upgrade head
```

## 매번 개발할 때

```powershell
# 터미널 1: 백엔드 (backend 폴더)
docker compose up -d          # DB가 꺼져 있으면
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# 터미널 2: 프론트 (front 폴더)
npm run dev
```

- 프론트: http://localhost:5173 (`/api` 요청은 Vite 프록시가 백엔드로 전달)
- API 문서: http://localhost:8000/docs

## 모델(테이블 구조)을 바꿨을 때

```powershell
alembic revision --autogenerate -m "무엇을 바꿨는지"   # alembic/versions/에 새 파일 생성 → 내용 확인
alembic upgrade head                                   # DB에 반영
```

새 모델 파일을 만들었다면 `app/models/__init__.py`에 import를 추가해야 autogenerate가 인식해요.

> ⚠️ `alembic.ini`에는 한글을 쓰지 마세요. Windows에서 cp949로 읽어서 Alembic이 실행되지 않아요.

## 폴더 구조

```
backend/
├── app/
│   ├── main.py        # FastAPI 앱, CORS, 라우터 등록
│   ├── config.py      # .env 설정값 읽기
│   ├── database.py    # DB 연결, Session, Base
│   ├── models/        # DB 테이블 (SQLAlchemy)
│   ├── schemas/       # API 요청/응답 모양 (Pydantic)
│   └── routers/       # API 엔드포인트
├── alembic/           # DB migration
├── docker-compose.yml # 개발용 PostgreSQL
└── requirements.txt
```

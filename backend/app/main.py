"""FastAPI 앱 시작점.

실행 (backend 폴더에서, 가상환경 활성화 후):
    uvicorn app.main:app --reload

API 문서(자동 생성): http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, rooms, typing_texts, works

app = FastAPI(title="Glitter API")

# CORS: 브라우저는 기본적으로 "다른 주소"(localhost:5173 → localhost:8000)로 요청하는 걸 막아요.
# 여기 적힌 주소에서 오는 요청은 허용한다고 서버가 알려주는 설정이에요.
# (개발 중엔 Vite 프록시를 써서 같은 주소처럼 요청하므로 사실 없어도 되지만,
#  프록시 없이 직접 요청하거나 배포할 때를 위해 넣어둬요)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)  # 회원가입/로그인
app.include_router(works.router)
app.include_router(typing_texts.router)  # 타자 연습 글
app.include_router(rooms.router)  # 실시간 방 (타자 대결 등)


@app.get("/api/health")
def health():
    """서버가 살아있는지 확인용"""
    return {"status": "ok"}

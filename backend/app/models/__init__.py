# 모델을 여기서 한 번에 import해둬요.
# Alembic(alembic/env.py)이 `from app import models` 한 줄로 모든 테이블을 알 수 있게 하기 위해서예요.
# 새 모델 파일을 만들면 여기에도 꼭 추가하세요. 안 그러면 migration 자동 생성에서 빠져요.
from app.models.typing_text import TypingText
from app.models.user import User
from app.models.work import Work

__all__ = ["TypingText", "User", "Work"]

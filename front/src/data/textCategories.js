// 타자 연습 글 분류. 백엔드(backend/app/models/typing_text.py의 TEXT_CATEGORIES)와 같은 목록이어야 해요.
export const TEXT_CATEGORIES = [
  { key: "poem", label: "시", desc: "운율을 느끼며 천천히" },
  { key: "quote", label: "명언", desc: "짧고 굵은 한 마디" },
  { key: "novel", label: "소설", desc: "고전 소설의 한 장면" },
  { key: "webnovel", label: "웹소설", desc: "빠르게 읽히는 첫 문장" },
  { key: "essay", label: "수필", desc: "일상의 잔잔한 이야기" },
  { key: "glitter", label: "글리터", desc: "글리터 사용자들이 직접 지은 글" },
]

// { poem: "시", quote: "명언", ... } — 키로 이름을 바로 찾을 때
export const CATEGORY_LABEL = Object.fromEntries(TEXT_CATEGORIES.map((c) => [c.key, c.label]))

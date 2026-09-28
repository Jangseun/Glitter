// 작품(완성된 이야기) 저장/조회 함수 모음.
//
// [지금] 백엔드가 아직 없어서 브라우저의 localStorage에 저장해요.
//        → 같은 브라우저에서만 보이고, 브라우저 데이터를 지우면 사라져요.
// [나중] FastAPI + PostgreSQL이 준비되면 이 파일의 함수 "안쪽"만 fetch 호출로 바꾸면 돼요.
//        함수 이름/인자/반환값 모양을 그대로 유지하면 페이지 코드는 손댈 필요가 없어요.
//        그래서 지금은 굳이 필요 없지만 모든 함수를 async(Promise 반환)로 만들어 뒀어요.
//        (fetch도 Promise를 반환하니까 페이지 쪽에서는 지금부터 await로 쓰는 습관을 맞춰두는 것)
//
// 작품 데이터 모양 (나중에 DB 테이블 설계할 때도 이 구조를 기준으로):
// {
//   id:        "문자열 ID",
//   title:     "제목",
//   body:      "본문",
//   mode:      "solo" | "relay",      // 혼자 쓰기 / 공동 이어쓰기
//   authors:   ["닉네임", ...],        // 작성자(공동이면 참여자 전원)
//   prompt:    { genre: "추리", ... } | null,  // 사용한 랜덤 소재 (자유 주제면 null)
//   createdAt: "2026-09-28T12:34:56.000Z"      // ISO 문자열
// }

const STORAGE_KEY = "glitter:works"

// localStorage에서 작품 배열 전체를 읽어요.
// 저장된 값이 없거나, 누가 값을 망가뜨려서 JSON 파싱이 실패해도 앱이 죽지 않게 빈 배열로 처리해요.
const readAll = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeAll = (works) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works))
}

// 고유 ID 만들기. crypto.randomUUID()는 https나 localhost에서만 쓸 수 있어서
// 혹시 안 되는 환경이면 시간+난수로 대신 만들어요.
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// 작품 목록 (최신순)
export const listWorks = async () => {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// 작품 하나 조회. 없으면 null
export const getWork = async (id) => {
  return readAll().find((work) => work.id === id) ?? null
}

// 새 작품 저장. 저장된 작품(id, createdAt 포함)을 돌려줘요.
export const createWork = async ({ title, body, mode = "solo", authors = [], prompt = null }) => {
  const work = {
    id: createId(),
    title,
    body,
    mode,
    authors,
    prompt,
    createdAt: new Date().toISOString(),
  }
  writeAll([...readAll(), work])
  return work
}

// 작품 삭제
export const deleteWork = async (id) => {
  writeAll(readAll().filter((work) => work.id !== id))
}

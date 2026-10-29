// 작품(완성된 이야기) 저장/조회 함수 모음. → FastAPI 백엔드(backend/app/routers/works.py)와 통신해요.
//
// 페이지 코드는 이 함수들만 부르고, fetch나 URL은 여기서만 다뤄요.
// (예전 localStorage 버전과 함수 이름/인자/반환값이 같아서 페이지 코드는 그대로예요)
//
// 작품 데이터 모양 (서버 응답, camelCase):
// {
//   id:        "UUID 문자열",
//   title:     "제목",
//   body:      "본문",
//   mode:      "solo" | "relay",      // 혼자 쓰기 / 공동 이어쓰기
//   authors:   ["닉네임", ...],
//   prompt:    { genre: "추리", ... } | null,
//   createdAt: "2026-09-28T12:34:56+00:00",
//   updatedAt: "2026-09-29T08:00:00+00:00" | null   // 수정한 적 없으면 null
// }

import { request } from "./http"

// 작품 목록 (최신순, 정렬은 서버가 해줌)
export const listWorks = () => request("/api/works")

// 작품 하나 조회. 없으면(404) null을 돌려줘요.
// 다른 에러(서버 꺼짐 등)는 그대로 throw해서 페이지가 "불러오지 못했어요"를 보여주게 해요.
export const getWork = async (id) => {
  try {
    return await request(`/api/works/${encodeURIComponent(id)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

// 새 작품 저장. 서버가 만든 id, createdAt이 포함된 작품을 돌려줘요.
export const createWork = ({ title, body, mode = "solo", authors = [], prompt = null }) =>
  request("/api/works", {
    method: "POST",
    body: { title, body, mode, authors, prompt },
  })

// 작품 수정. 바꿀 필드만 넘기면 돼요. 예) updateWork(id, { title: "새 제목" }), updateWork(id, { isPublic: true })
// 수정된 작품(updatedAt 갱신됨)을 돌려줘요.
// 주의: 예전엔 { title, body }만 골라서 보내서 isPublic이 서버에 안 갔어요. (공개하기가 안 되던 버그)
// 받은 객체를 그대로 보내고, 어떤 필드를 받을지는 서버(WorkUpdate 스키마)가 정해요.
export const updateWork = (id, changes) =>
  request(`/api/works/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
  })

// 작품 삭제
export const deleteWork = (id) => request(`/api/works/${encodeURIComponent(id)}`, { method: "DELETE" })

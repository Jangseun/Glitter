// 타자 연습 글 API (backend/app/routers/typing_texts.py)
import { request } from "./http"

// category가 없거나 "all"이면 전체
const categoryQuery = (category) => (category && category !== "all" ? `category=${category}` : "")

// 글 목록 → [{ id, category, title, author, content, userId, uploader }, ...]
export const listTexts = (category) => request(`/api/texts?${categoryQuery(category)}`)

// 무작위 한 개. exclude: 직전에 친 글 번호 (같은 글이 연달아 나오지 않게)
export const randomText = ({ category, exclude } = {}) => {
  const params = [categoryQuery(category), exclude != null ? `exclude=${exclude}` : ""].filter(Boolean).join("&")
  return request(`/api/texts/random?${params}`)
}

// 글 등록 (로그인 필요)
export const createText = ({ category, title, author, content }) =>
  request("/api/texts", { method: "POST", body: { category, title, author, content } })

// 내가 등록한 글 삭제
export const deleteText = (id) => request(`/api/texts/${id}`, { method: "DELETE" })

// 출처 표시용 문구. 예) "윤동주, 「서시」" / "속담" / "Glitter, 「겨울 골목」"
export const textSource = (t) => [t.author, t.title && `「${t.title}」`].filter(Boolean).join(", ")

// API 글 → 타자 화면(useTypingSession, 대결 방)이 쓰는 모양 { id, text, source }
export const toTypingText = (t) => ({ id: t.id, text: t.content, source: textSource(t) })

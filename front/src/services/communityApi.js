// 커뮤니티 API (backend/app/routers/community.py)
// 목록/읽기는 로그인 없이도 되고, 좋아요/댓글은 로그인 필요해요.
import { request } from "./http"

// 공개 작품 목록. sort: "latest" | "popular", offset: 몇 개 건너뛸지 (더 보기용)
export const listPublicWorks = ({ sort = "latest", offset = 0 } = {}) =>
  request(`/api/community/works?sort=${sort}&offset=${offset}`)

export const PAGE_SIZE = 20 // 백엔드 PAGE_SIZE와 같아야 "더 보기" 버튼 판단이 맞아요

export const getPublicWork = (id) => request(`/api/community/works/${encodeURIComponent(id)}`)

// 좋아요 / 취소 → { liked, likeCount }
export const likeWork = (id) => request(`/api/community/works/${encodeURIComponent(id)}/like`, { method: "POST" })
export const unlikeWork = (id) => request(`/api/community/works/${encodeURIComponent(id)}/like`, { method: "DELETE" })

export const listComments = (id) => request(`/api/community/works/${encodeURIComponent(id)}/comments`)
export const createComment = (id, body) =>
  request(`/api/community/works/${encodeURIComponent(id)}/comments`, { method: "POST", body: { body } })
export const deleteComment = (commentId) => request(`/api/community/comments/${commentId}`, { method: "DELETE" })

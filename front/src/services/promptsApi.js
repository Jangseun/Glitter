// 개인 소재함 API (backend/app/routers/prompts.py) — 전부 로그인 필요
import { request } from "./http"

// 내 소재 목록 → [{ id, prompt: { genre, ... }, memo, createdAt }, ...]
export const listPrompts = () => request("/api/prompts")

export const savePrompt = ({ prompt, memo = "" }) => request("/api/prompts", { method: "POST", body: { prompt, memo } })

export const deletePrompt = (id) => request(`/api/prompts/${id}`, { method: "DELETE" })

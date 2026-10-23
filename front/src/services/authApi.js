// 회원가입 / 로그인 API (backend/app/routers/auth.py)
import { request } from "./http"

// 성공하면 { accessToken, user: { id, username, nickname } }
export const signup = ({ username, password, nickname }) =>
  request("/api/auth/signup", { method: "POST", body: { username, password, nickname } })

export const login = ({ username, password }) => request("/api/auth/login", { method: "POST", body: { username, password } })

// 저장된 토큰의 주인 정보. 토큰이 만료/위조됐으면 401 에러
export const fetchMe = () => request("/api/auth/me")

// 회원가입 / 로그인 API (backend/app/routers/auth.py)
import { request } from "./http"

// 성공하면 { accessToken, user: { id, username, nickname } }
export const signup = ({ username, password, nickname }) =>
  request("/api/auth/signup", { method: "POST", body: { username, password, nickname } })

export const login = ({ username, password }) => request("/api/auth/login", { method: "POST", body: { username, password } })

// 저장된 토큰의 주인 정보. 토큰이 만료/위조됐으면 401 에러
export const fetchMe = () => request("/api/auth/me")

// 닉네임 변경 → 바뀐 회원 정보
export const updateProfile = ({ nickname }) => request("/api/auth/me", { method: "PATCH", body: { nickname } })

// 비밀번호 변경 (지금 비밀번호 확인 필요)
export const changePassword = ({ currentPassword, newPassword }) =>
  request("/api/auth/password", { method: "PUT", body: { currentPassword, newPassword } })

// 회원 탈퇴 (비밀번호 확인 필요)
export const deleteAccount = ({ password }) => request("/api/auth/me", { method: "DELETE", body: { password } })

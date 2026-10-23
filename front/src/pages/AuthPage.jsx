import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { NICKNAME_MAX } from "../utils/nickname"
import "./AuthPage.css"

// 로그인(/login) / 회원가입(/signup) 페이지. 생김새가 거의 같아서 mode로 나눠 한 파일에서 그려요.
const AuthPage = ({ mode }) => {
  const isSignup = mode === "signup"
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 로그인 후 돌아갈 주소. (RequireAuth나 "로그인하고 저장" 버튼이 ?next=/works 처럼 붙여줘요)
  // "/"로 시작하는 우리 사이트 주소만 허용해요. "//evil.com" 같은 걸 넣어서
  // 로그인 후 다른 사이트로 보내버리는 공격(open redirect)을 막기 위해서예요.
  const rawNext = searchParams.get("next") || "/"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // 서버도 똑같이 검사하지만, 바로 알려주면 사용자가 덜 헤매요.
    if (isSignup) {
      if (!/^[a-z0-9_]{4,20}$/.test(username)) return setError("아이디는 영어 소문자, 숫자, _ 로 4~20자예요.")
      if (password.length < 8) return setError("비밀번호는 8자 이상이어야 해요.")
      if (!nickname.trim()) return setError("닉네임을 입력해주세요.")
    }

    setIsSubmitting(true)
    try {
      if (isSignup) await signup({ username, password, nickname: nickname.trim() })
      else await login(username, password)
      // replace: 로그인 화면을 기록에서 지워서, 뒤로 가기 했을 때 로그인 화면이 다시 나오지 않게
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.status ? err.message : "서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해주세요.")
      setIsSubmitting(false)
    }
  }

  // 로그인 ↔ 회원가입을 오갈 때도 돌아갈 주소(next)는 유지해요.
  const otherLink = `${isSignup ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`

  return (
    <div className="page auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">{isSignup ? "회원가입" : "로그인"}</h1>
        <p className="auth-sub">
          {isSignup ? "가입하면 쓴 이야기를 저장하고 글귀를 등록할 수 있어요." : "다시 만나서 반가워요!"}
        </p>

        <label className="auth-field">
          <span>아이디</span>
          <input
            className="field"
            value={username}
            // 아이디는 소문자만 쓰니까 입력하는 대로 소문자로 바꿔줘요
            onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
            autoComplete="username"
            autoFocus
            maxLength={20}
          />
        </label>

        <label className="auth-field">
          <span>비밀번호</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // 브라우저 비밀번호 관리자가 알맞게 자동완성/저장 제안을 하도록 알려주는 값
            autoComplete={isSignup ? "new-password" : "current-password"}
            maxLength={128}
          />
        </label>

        {isSignup && (
          <label className="auth-field">
            <span>닉네임</span>
            <input
              className="field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={NICKNAME_MAX}
              placeholder="작품과 친구 방에서 보일 이름"
            />
          </label>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="btn primary auth-submit" disabled={isSubmitting || !username || !password}>
          {isSubmitting ? "잠시만요…" : isSignup ? "가입하기" : "로그인"}
        </button>

        <p className="auth-switch">
          {isSignup ? "이미 계정이 있나요?" : "처음이신가요?"} <Link to={otherLink}>{isSignup ? "로그인" : "회원가입"}</Link>
        </p>
      </form>
    </div>
  )
}

export default AuthPage

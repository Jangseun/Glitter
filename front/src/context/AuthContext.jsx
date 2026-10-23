import { createContext, useContext, useEffect, useState } from "react"
import * as authApi from "../services/authApi"
import { getToken, setToken } from "../services/http"

// 로그인 상태를 앱 전체에서 같이 쓰기 위한 Context.
//
// 어디서든 const { user, login, logout } = useAuth() 로 꺼내 써요.
//   user:     로그인한 회원 { id, username, nickname } / 로그인 안 했으면 null
//   checking: 앱을 처음 켰을 때 "저장된 토큰이 아직 유효한지" 서버에 물어보는 중이면 true
//             (이때 바로 "로그인 안 됨"으로 판단하면, 로그인한 사람도 잠깐 로그인 화면으로 튕겨나가요)

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  // 저장된 토큰이 있을 때만 확인이 필요해요. 없으면 처음부터 "확인 끝(로그인 안 됨)"
  const [checking, setChecking] = useState(() => Boolean(getToken()))

  // 앱을 처음 켰을 때 한 번: 저장된 토큰으로 내 정보를 불러와서 로그인 상태를 복구해요.
  useEffect(() => {
    if (!getToken()) return
    let ignore = false
    authApi
      .fetchMe()
      .then((me) => {
        if (!ignore) setUser(me)
      })
      .catch(() => {
        // 토큰이 만료됐거나 서버가 꺼져 있으면 로그아웃 상태로 시작
        // (서버가 꺼진 경우까지 토큰을 지우면 다시 로그인해야 해서, 401일 때만 지워도 되지만 단순하게 처리)
        if (!ignore) setToken(null)
      })
      .finally(() => {
        if (!ignore) setChecking(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // 다른 탭에서 로그인/로그아웃하면 이 탭도 따라가요.
  // "storage" 이벤트는 같은 사이트의 "다른 탭"이 localStorage를 바꿨을 때만 발생해요.
  // (이어쓰기 방에서 "새 탭에서 로그인"하고 돌아오면 저장 버튼이 바로 생기는 이유)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== "glitter:token") return
      if (!e.newValue) {
        setUser(null)
        return
      }
      authApi.fetchMe().then(setUser).catch(() => setUser(null))
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  // 로그인/회원가입 성공 공통 처리: 토큰 저장 + user 상태 갱신
  const applyAuth = ({ accessToken, user: me }) => {
    setToken(accessToken)
    setUser(me)
    return me
  }

  const login = async (username, password) => applyAuth(await authApi.login({ username, password }))
  const signup = async (form) => applyAuth(await authApi.signup(form))

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, checking, login, signup, logout }}>{children}</AuthContext.Provider>
}

// Provider와 짝이 되는 hook이라 같은 파일에 둬요.
// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext)

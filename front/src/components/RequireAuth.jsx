import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

// 로그인한 사람만 볼 수 있는 페이지를 감싸는 컴포넌트.
//   <Route path="/works" element={<RequireAuth><Works /></RequireAuth>} />
// 로그인 안 했으면 로그인 페이지로 보내고, 로그인하면 원래 가려던 페이지로 돌아오게 해요.
const RequireAuth = ({ children }) => {
  const { user, checking } = useAuth()
  const location = useLocation()

  // 저장된 토큰을 확인하는 중이면 아직 판단하지 않고 기다려요. (로그인 화면으로 잘못 튕기지 않게)
  if (checking) return <p className="empty">불러오는 중…</p>

  if (!user) {
    // next: 로그인 후 돌아올 주소. replace: 뒤로 가기 했을 때 이 페이지로 다시 튕겨오지 않게
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return children
}

export default RequireAuth

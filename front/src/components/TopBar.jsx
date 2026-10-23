import { Link, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useSettings } from "../context/SettingsContext"
import "./TopBar.css"

// 모든 페이지 위에 붙는 상단 바: 로고, 메뉴, 테마 빠른 전환, 설정, 로그인/로그아웃
const NAV = [
  { to: "/typing/solo", label: "타자 연습" },
  { to: "/typing/battle", label: "타자 대결" },
  { to: "/writing/solo", label: "이야기 쓰기" },
  { to: "/writing/relay", label: "이어쓰기" },
  { to: "/works", label: "내 작품" },
]

// 테마 버튼을 누를 때마다 시스템 → 라이트 → 다크 → 시스템 … 순서로 바뀌어요.
const THEME_CYCLE = { system: "light", light: "dark", dark: "system" }
const THEME_ICON = { system: "🌓", light: "☀️", dark: "🌙" }
const THEME_LABEL = { system: "시스템 테마", light: "라이트 테마", dark: "다크 테마" }

const TopBar = () => {
  const { user, checking, logout } = useAuth()
  const { settings, updateSetting } = useSettings()
  const location = useLocation()

  // 로그인 버튼을 누르면, 로그인 후 지금 보던 페이지로 돌아오게 해요. (로그인/가입 화면 자체는 제외)
  const here = location.pathname + location.search
  const loginHref = ["/login", "/signup"].includes(location.pathname) ? "/login" : `/login?next=${encodeURIComponent(here)}`

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo">
        Glitter
      </Link>

      <nav className="topbar-nav">
        {/* NavLink: 지금 주소와 같은 메뉴에 자동으로 "active" 클래스를 붙여줘요 */}
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className="topbar-link">
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-right">
        <button
          type="button"
          className="topbar-icon"
          onClick={() => updateSetting("theme", THEME_CYCLE[settings.theme])}
          title={`${THEME_LABEL[settings.theme]} (눌러서 바꾸기)`}
          aria-label={THEME_LABEL[settings.theme]}
        >
          {THEME_ICON[settings.theme]}
        </button>
        <Link to="/settings" className="topbar-icon" title="설정" aria-label="설정">
          ⚙️
        </Link>

        {/* 토큰 확인 중일 땐 아무것도 안 보여줘요. (로그인 버튼이 잠깐 보였다가 닉네임으로 바뀌는 깜빡임 방지) */}
        {checking ? null : user ? (
          <>
            <span className="topbar-user">{user.nickname}님</span>
            <button type="button" className="btn topbar-btn" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link to={loginHref} className="btn primary topbar-btn">
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}

export default TopBar

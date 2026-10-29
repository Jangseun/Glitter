import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useSettings } from "../context/SettingsContext"
import "./TopBar.css"

// 모든 페이지 위에 붙는 상단 바: 로고, 메뉴, 테마 빠른 전환, 설정, 로그인 / 내 메뉴(드롭다운)
const NAV = [
  { to: "/typing/solo", label: "타자 연습" },
  { to: "/typing/battle", label: "타자 대결" },
  { to: "/writing/solo", label: "이야기 쓰기" },
  { to: "/writing/relay", label: "이어쓰기" },
  { to: "/community", label: "커뮤니티" },
]

// 닉네임을 누르면 펼쳐지는 "내 메뉴". 로그인해야 쓸 수 있는 개인 공간들을 여기에 모아요.
const MY_MENU = [
  { to: "/works", label: "내 작품" },
  { to: "/prompts", label: "내 소재함" },
  { to: "/settings?tab=profile", label: "프로필 · 타자 기록" },
  { to: "/settings?tab=account", label: "계정 설정" },
]

// 테마 버튼을 누를 때마다 시스템 → 라이트 → 다크 → 시스템 … 순서로 바뀌어요.
const THEME_CYCLE = { system: "light", light: "dark", dark: "system" }
const THEME_LABEL = { system: "시스템 테마", light: "라이트 테마", dark: "다크 테마" }

// 아이콘은 이모지 대신 SVG 선으로 그려요.
// 이모지는 운영체제마다 모양/색이 제각각이라 화면 색과 안 어울리는데,
// SVG에 stroke="currentColor"를 주면 버튼 글자색(= 테마 색)을 그대로 따라가요.
const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const THEME_ICON = {
  // 반쪽 채운 원 = 시스템 설정 따르기
  system: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </Icon>
  ),
  light: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  ),
  dark: (
    <Icon>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </Icon>
  ),
}
const GEAR_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
)

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
        {/* 좁은 화면(휴대폰)에서만 보이는 메뉴 버튼. key로 페이지 이동 시 저절로 닫히게 */}
        <MobileNav key={here} />
        <button
          type="button"
          className="topbar-icon"
          onClick={() => updateSetting("theme", THEME_CYCLE[settings.theme])}
          title={`${THEME_LABEL[settings.theme]} (눌러서 바꾸기)`}
          aria-label={THEME_LABEL[settings.theme]}
        >
          {THEME_ICON[settings.theme]}
        </button>
        <Link to="/settings?tab=display" className="topbar-icon" title="화면 설정" aria-label="화면 설정">
          {GEAR_ICON}
        </Link>

        {/* 토큰 확인 중일 땐 아무것도 안 보여줘요. (로그인 버튼이 잠깐 보였다가 닉네임으로 바뀌는 깜빡임 방지) */}
        {checking ? null : user ? (
          // key: 페이지를 이동할 때마다 메뉴를 새로 만들어서 저절로 닫히게 해요
          <UserMenu key={here} nickname={user.nickname} onLogout={logout} />
        ) : (
          <Link to={loginHref} className="btn primary topbar-btn">
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}

// 휴대폰 화면용: 위쪽 메뉴(NAV)가 숨겨지는 대신, 이 버튼을 누르면 같은 메뉴가 펼쳐져요.
// 열고 닫는 동작은 아래 UserMenu와 같은 방식(useDropdown)이에요.
const MobileNav = () => {
  const { open, setOpen, ref } = useDropdown()
  return (
    <div className="umenu mnav" ref={ref}>
      <button type="button" className="topbar-icon" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="메뉴">
        <Icon>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </Icon>
      </button>
      {open && (
        <div className="umenu-list mnav-list" role="menu">
          <Link to="/" className="umenu-item" role="menuitem">
            홈
          </Link>
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="umenu-item" role="menuitem">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// 펼침 메뉴 공통: 열림 상태 + 바깥 클릭/Esc로 닫기
const useDropdown = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 메뉴가 열려 있을 때 바깥을 클릭하거나 Esc를 누르면 닫아요.
  // 메뉴가 닫혀 있을 땐 리스너를 달지 않아요. (필요할 때만 이벤트를 듣기)
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      // ref 안쪽(메뉴 자신)을 클릭한 거면 무시
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const handleKey = (e) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return { open, setOpen, ref }
}

// 닉네임 버튼 + 펼쳐지는 메뉴
const UserMenu = ({ nickname, onLogout }) => {
  const { open, setOpen, ref: menuRef } = useDropdown()

  return (
    <div className="umenu" ref={menuRef}>
      <button type="button" className="umenu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        {nickname}님 <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="umenu-list" role="menu">
          {MY_MENU.map((item) => (
            <Link key={item.to} to={item.to} className="umenu-item" role="menuitem">
              {item.label}
            </Link>
          ))}
          <button type="button" className="umenu-item umenu-logout" role="menuitem" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  )
}

export default TopBar

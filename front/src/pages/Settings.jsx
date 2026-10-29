import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import LineChart from "../components/LineChart"
import { useAuth } from "../context/AuthContext"
import { useSettings } from "../context/SettingsContext"
import { CATEGORY_LABEL } from "../data/textCategories"
import { changePassword, deleteAccount, updateProfile } from "../services/authApi"
import { getSummary, listRecords } from "../services/recordsApi"
import { NICKNAME_MAX } from "../utils/nickname"
import "./Settings.css"

// 설정 페이지 (/settings) — 탭 3개
//   profile: 내 타자 기록 요약 + 성장 그래프 + 최근 기록 표 (로그인 필요)
//   display: 테마 / 글꼴 / 타자 글자 크기 (로그인 없이도 됨, 브라우저에 저장)
//   account: 닉네임 / 비밀번호 변경, 회원 탈퇴 (로그인 필요)
// 지금 탭은 주소(?tab=account)에 저장해요. 상단 바 메뉴에서 특정 탭으로 바로 들어올 수 있게.
const TABS = [
  { key: "profile", label: "프로필" },
  { key: "display", label: "화면" },
  { key: "account", label: "계정" },
]

const Settings = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  // 로그인 안 했으면 기본 탭을 "화면"으로 (프로필/계정은 로그인이 필요하니까)
  const tab = TABS.some((t) => t.key === searchParams.get("tab")) ? searchParams.get("tab") : user ? "profile" : "display"

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">{user ? `${user.nickname}님의 설정` : "설정"}</h1>
      </header>

      <div className="st-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`st-tab${tab === t.key ? " on" : ""}`}
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "display" && <DisplayTab />}
      {tab !== "display" && !user && <LoginNeeded />}
      {tab === "profile" && user && <ProfileTab />}
      {tab === "account" && user && <AccountTab />}
    </div>
  )
}

const LoginNeeded = () => {
  const location = useLocation()
  return (
    <div className="empty">
      <p>로그인하면 타자 기록과 계정을 관리할 수 있어요.</p>
      <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="btn primary">
        로그인
      </Link>
    </div>
  )
}

// =====================================================================
// 프로필 탭: 기록 요약 + 성장 그래프 + 최근 기록 표
// =====================================================================
const ProfileTab = () => {
  const [summary, setSummary] = useState(null)
  const [records, setRecords] = useState(null)
  const [error, setError] = useState("")

  // 요약과 기록 목록을 동시에 불러와요 (Promise.all)
  useEffect(() => {
    let ignore = false
    Promise.all([getSummary(), listRecords(50)])
      .then(([s, r]) => {
        if (ignore) return
        setSummary(s)
        setRecords(r)
      })
      .catch((err) => {
        console.error(err)
        if (!ignore) setError("기록을 불러오지 못했어요.")
      })
    return () => {
      ignore = true
    }
  }, [])

  if (error) return <p className="st-error">{error}</p>
  if (!summary || !records) return <p className="empty">불러오는 중…</p>

  if (summary.totalCount === 0) {
    return (
      <div className="empty">
        <p>아직 타자 기록이 없어요. 한 판 치면 여기에 기록이 쌓여요!</p>
        <Link to="/typing/solo" className="btn primary">
          타자 연습하러 가기
        </Link>
      </div>
    )
  }

  // 서버는 최신순으로 줘요. 그래프는 왼쪽이 옛날 → 오른쪽이 최근이어야 하니까 뒤집어요.
  // [...records]로 복사한 뒤 reverse: 원본 배열(state)을 직접 바꾸지 않기 위해서예요.
  const chronological = [...records].reverse()
  // 그래프 가로축 글자: 기록이 전부 같은 날이면 "10/27, 10/27"처럼 똑같아 보여서 시각(14:05)으로 보여줘요
  const sameDay = shortDate(chronological[0].createdAt) === shortDate(chronological.at(-1).createdAt)
  const axisLabel = (iso) => (sameDay ? shortTime(iso) : shortDate(iso))
  const speedData = chronological.map((r) => ({ label: axisLabel(r.createdAt), value: r.speed }))
  const accuracyData = chronological.map((r) => ({ label: axisLabel(r.createdAt), value: r.accuracy }))

  return (
    <div className="st-profile">
      {/* 요약 숫자 카드 */}
      <div className="st-tiles">
        <StatTile label="최고 타수" value={summary.bestSpeed} unit="타" />
        <StatTile label="최근 10판 평균" value={Math.round(summary.recentSpeed)} unit="타" />
        <StatTile label="최근 평균 정확도" value={summary.recentAccuracy} unit="%" />
        <StatTile label="연습 횟수" value={summary.totalCount} unit="판" />
        <StatTile label="총 연습 시간" value={formatDuration(summary.totalSeconds)} />
      </div>

      {/* 성장 그래프: 타수와 정확도는 단위가 달라서 한 그래프에 축 두 개로 겹치지 않고 따로 그려요 */}
      <div className="st-charts">
        <LineChart title={`타수 변화 (최근 ${records.length}판)`} data={speedData} unit="타" yMin={0} />
        <LineChart title="정확도 변화" data={accuracyData} unit="%" yMax={100} />
      </div>

      {/* 그래프 값을 표로도 볼 수 있게 (마우스를 못 쓰거나 정확한 숫자를 보고 싶을 때) */}
      <details className="st-table-wrap">
        <summary>최근 기록 표로 보기</summary>
        <div className="table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>종류</th>
                <th>분류</th>
                <th>타수</th>
                <th>정확도</th>
                <th>오타</th>
                <th>시간</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{fullDate(r.createdAt)}</td>
                  <td>{r.mode === "battle" ? "대결" : "연습"}</td>
                  <td>{CATEGORY_LABEL[r.category] ?? "-"}</td>
                  <td>{r.speed}타</td>
                  <td>{r.accuracy}%</td>
                  <td>{r.typoCount}</td>
                  <td>{r.seconds.toFixed(1)}초</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

const StatTile = ({ label, value, unit }) => (
  <div className="st-tile">
    <span className="st-tile-label">{label}</span>
    <span className="st-tile-value">
      {value}
      {unit && <small>{unit}</small>}
    </span>
  </div>
)

// "2026-10-27T05:12:00Z" → "10/27"
const shortDate = (iso) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
// → "14:05"
const shortTime = (iso) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
// → "10월 27일 14:12"
const fullDate = (iso) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
// 3725초 → "1시간 2분", 95초 → "1분 35초"
const formatDuration = (seconds) => {
  const s = Math.round(seconds)
  if (s >= 3600) return `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분`
  if (s >= 60) return `${Math.floor(s / 60)}분 ${s % 60}초`
  return `${s}초`
}

// =====================================================================
// 화면 탭 (기존 설정 화면)
// =====================================================================
// 설정 항목을 추가하려면 여기에 넣고,
// SettingsContext의 DEFAULT_SETTINGS와 index.css의 data-* 규칙도 같이 추가하면 돼요.
const OPTIONS = [
  {
    key: "theme",
    label: "테마",
    choices: [
      { value: "system", label: "시스템 설정 따르기" },
      { value: "light", label: "라이트" },
      { value: "dark", label: "다크" },
    ],
  },
  {
    key: "font",
    label: "글꼴",
    desc: "타자 연습 문장과 이야기 본문에 쓰는 글꼴이에요.",
    choices: [
      { value: "sans", label: "고딕" },
      { value: "serif", label: "명조" },
    ],
  },
  {
    key: "typingSize",
    label: "타자 글자 크기",
    choices: [
      { value: "small", label: "작게" },
      { value: "medium", label: "보통" },
      { value: "large", label: "크게" },
    ],
  },
]

const DisplayTab = () => {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="settings">
      {OPTIONS.map((option) => (
        <section key={option.key} className="settings-row">
          <div>
            <h2 className="settings-label">{option.label}</h2>
            {option.desc && <p className="settings-desc">{option.desc}</p>}
          </div>
          <div className="seg" role="radiogroup" aria-label={option.label}>
            {option.choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={settings[option.key] === choice.value}
                className={`seg-btn${settings[option.key] === choice.value ? " on" : ""}`}
                onClick={() => updateSetting(option.key, choice.value)}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* 글꼴/크기를 바꿨을 때 바로 확인할 수 있는 미리보기 */}
      <section className="settings-preview">
        <p className="settings-desc">미리보기</p>
        <p className="settings-sample">죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를,</p>
      </section>
    </div>
  )
}

// =====================================================================
// 계정 탭
// =====================================================================
const AccountTab = () => {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()

  // ---- 닉네임 ----
  const [nickname, setNickname] = useState(user.nickname)
  const [nickMsg, setNickMsg] = useState("")
  const saveNickname = async (e) => {
    e.preventDefault()
    try {
      updateUser(await updateProfile({ nickname: nickname.trim() }))
      setNickMsg("바꿨어요!")
    } catch (err) {
      setNickMsg(err.message || "바꾸지 못했어요.")
    }
  }

  // ---- 비밀번호 ----
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [pwMsg, setPwMsg] = useState("")
  const savePassword = async (e) => {
    e.preventDefault()
    if (newPw.length < 8) {
      setPwMsg("새 비밀번호는 8자 이상이어야 해요.")
      return
    }
    try {
      await changePassword({ currentPassword: currentPw, newPassword: newPw })
      setCurrentPw("")
      setNewPw("")
      setPwMsg("비밀번호를 바꿨어요!")
    } catch (err) {
      setPwMsg(err.message || "바꾸지 못했어요.")
    }
  }

  // ---- 탈퇴 ----
  const [deletePw, setDeletePw] = useState("")
  const [deleteMsg, setDeleteMsg] = useState("")
  const handleDelete = async (e) => {
    e.preventDefault()
    if (!window.confirm("정말 탈퇴할까요? 작품, 소재함, 타자 기록, 댓글이 모두 사라지고 되돌릴 수 없어요.")) return
    try {
      await deleteAccount({ password: deletePw })
      logout()
      navigate("/", { replace: true })
    } catch (err) {
      setDeleteMsg(err.message || "탈퇴하지 못했어요.")
    }
  }

  return (
    <div className="settings">
      <section className="settings-row">
        <div>
          <h2 className="settings-label">아이디</h2>
          <p className="settings-desc">{user.username} (아이디는 바꿀 수 없어요)</p>
        </div>
      </section>

      <form className="settings-row stack" onSubmit={saveNickname}>
        <div>
          <h2 className="settings-label">닉네임</h2>
          <p className="settings-desc">작품, 댓글, 친구 방에서 보이는 이름이에요.</p>
        </div>
        <div className="st-inline">
          <input className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={NICKNAME_MAX} />
          <button type="submit" className="btn" disabled={!nickname.trim() || nickname.trim() === user.nickname}>
            바꾸기
          </button>
        </div>
        {nickMsg && <p className="st-msg">{nickMsg}</p>}
      </form>

      <form className="settings-row stack" onSubmit={savePassword}>
        <div>
          <h2 className="settings-label">비밀번호</h2>
          <p className="settings-desc">지금 비밀번호를 한 번 더 확인한 뒤 바꿔요.</p>
        </div>
        <div className="st-inline">
          {/* autoComplete: 브라우저 비밀번호 관리자가 "현재/새 비밀번호"를 구분하도록 알려줘요 */}
          <input className="field" type="password" placeholder="지금 비밀번호" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" />
          <input className="field" type="password" placeholder="새 비밀번호 (8자 이상)" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
          <button type="submit" className="btn" disabled={!currentPw || !newPw}>
            바꾸기
          </button>
        </div>
        {pwMsg && <p className="st-msg">{pwMsg}</p>}
      </form>

      <form className="settings-row stack st-danger" onSubmit={handleDelete}>
        <div>
          <h2 className="settings-label">회원 탈퇴</h2>
          <p className="settings-desc">작품·소재함·타자 기록·댓글이 모두 지워져요. 등록한 타자 연습 글은 남아요.</p>
        </div>
        <div className="st-inline">
          <input className="field" type="password" placeholder="비밀번호 확인" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} autoComplete="current-password" />
          <button type="submit" className="btn st-danger-btn" disabled={!deletePw}>
            탈퇴하기
          </button>
        </div>
        {deleteMsg && <p className="st-msg">{deleteMsg}</p>}
      </form>
    </div>
  )
}

export default Settings

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import PromptCard from "../components/PromptCard"
import PromptPicker from "../components/PromptPicker"
import { STORY_PROMPT_CATEGORIES } from "../data/storyPrompts"
import { deletePrompt, listPrompts, savePrompt } from "../services/promptsApi"
import { formatDate } from "../utils/format"
import "./Prompts.css"

// 개인 소재함 페이지 (/prompts) — 로그인한 사람만 (App.jsx에서 RequireAuth로 감쌈)
//   - 위: 랜덤으로 뽑아서 저장하기 / 직접 만들어서 저장하기
//   - 아래: 저장한 소재 목록 → "이 소재로 쓰기"를 누르면 혼자 쓰기로 이동
const Prompts = () => {
  const navigate = useNavigate()
  const [prompts, setPrompts] = useState(null)
  const [error, setError] = useState("")

  // 위쪽 "만들기" 영역: random(뽑기) / custom(직접 입력)
  const [mode, setMode] = useState("random")
  const [drawn, setDrawn] = useState(null)

  const reload = () =>
    listPrompts()
      .then(setPrompts)
      .catch((err) => {
        console.error(err)
        setError("소재함을 불러오지 못했어요.")
      })

  // 처음 들어왔을 때 목록 불러오기
  useEffect(() => {
    reload()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm("이 소재를 지울까요?")) return
    try {
      await deletePrompt(id)
      setPrompts((list) => list.filter((p) => p.id !== id))
    } catch (err) {
      console.error(err)
      setError("삭제하지 못했어요.")
    }
  }

  // 혼자 쓰기 페이지로 이동하면서 소재를 같이 넘겨요.
  // navigate의 state: 주소창에는 안 보이고, 이동한 페이지에서 useLocation().state로 꺼낼 수 있는 값
  const writeWith = (prompt) => navigate("/writing/solo", { state: { prompt } })

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">내 소재함</h1>
      </header>

      <section className="pb-maker">
        <div className="seg">
          <button type="button" className={`seg-btn${mode === "random" ? " on" : ""}`} onClick={() => setMode("random")}>
            🎲 뽑아서 저장
          </button>
          <button type="button" className={`seg-btn${mode === "custom" ? " on" : ""}`} onClick={() => setMode("custom")}>
            ✏️ 직접 만들기
          </button>
        </div>

        {/* 뽑기: 기존 소재 뽑기 화면을 그대로 써요. 뽑은 뒤 ☆ 버튼으로 저장하면 아래 목록을 다시 불러와요 */}
        {mode === "random" ? (
          <PromptPicker value={drawn} onChange={setDrawn} onSaved={reload} />
        ) : (
          <CustomPromptForm onSaved={reload} />
        )}
      </section>

      <section>
        <h2 className="pb-heading">저장한 소재 {prompts && <small>{prompts.length}개</small>}</h2>
        {error && <p className="pb-error">{error}</p>}
        {!error && prompts === null && <p className="empty">불러오는 중…</p>}
        {prompts?.length === 0 && <p className="empty">아직 저장한 소재가 없어요.</p>}
        {prompts?.length > 0 && (
          <ul className="pb-list">
            {prompts.map((saved) => (
              <li key={saved.id} className="pb-item">
                <PromptCard prompt={saved.prompt} />
                {saved.memo && <p className="pb-memo">📝 {saved.memo}</p>}
                <div className="pb-actions">
                  <span className="pb-date">{formatDate(saved.createdAt)}</span>
                  <button type="button" className="btn" onClick={() => handleDelete(saved.id)}>
                    삭제
                  </button>
                  <button type="button" className="btn primary" onClick={() => writeWith(saved.prompt)}>
                    이 소재로 쓰기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// 직접 소재 만들기: 항목마다 입력칸 (비워둔 항목은 저장 안 됨) + 메모
const CustomPromptForm = ({ onSaved }) => {
  const [values, setValues] = useState({})
  const [memo, setMemo] = useState("")
  const [status, setStatus] = useState("") // "" | saving | saved | error

  // 빈 칸은 빼고 { genre: "추리" } 처럼 채운 항목만 모아요
  const filled = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()))
  const canSave = Object.keys(filled).length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus("saving")
    try {
      await savePrompt({ prompt: filled, memo })
      setValues({})
      setMemo("")
      setStatus("saved")
      onSaved()
    } catch (err) {
      console.error(err)
      setStatus("error")
    }
  }

  return (
    <form className="pb-custom" onSubmit={handleSubmit}>
      <div className="pb-fields">
        {STORY_PROMPT_CATEGORIES.map((c) => (
          <label key={c.key} className="pb-field">
            <span>{c.label}</span>
            <input
              className="field"
              value={values[c.key] ?? ""}
              // [c.key]: 계산된 속성 이름. c.key가 "genre"면 { genre: 입력값 } 이 돼요
              onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
              maxLength={50}
              placeholder="비워도 돼요"
            />
          </label>
        ))}
      </div>
      <label className="pb-field">
        <span>메모 (선택)</span>
        <input className="field" value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={100} placeholder="떠오른 아이디어를 적어두세요" />
      </label>
      <div className="pb-actions">
        {status === "saved" && <span className="pb-date">저장했어요!</span>}
        {status === "error" && <span className="pb-error">저장하지 못했어요.</span>}
        <button type="submit" className="btn primary" disabled={!canSave || status === "saving"}>
          소재함에 저장
        </button>
      </div>
    </form>
  )
}

export default Prompts

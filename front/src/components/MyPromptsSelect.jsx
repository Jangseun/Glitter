import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { STORY_PROMPT_CATEGORIES } from "../data/storyPrompts"
import { listPrompts } from "../services/promptsApi"
import "./MyPromptsSelect.css"

// "내 소재함에서 고르기" 버튼 + 펼치면 저장해둔 소재 목록.
// 혼자 쓰기(소재 뽑기 단계)와 이어쓰기 대기실(방장)에서 써요. 로그인 안 했으면 아무것도 안 보여요.
//
// onSelect: 소재를 고르면 { genre: "추리", ... } 객체를 넘겨줘요
const MyPromptsSelect = ({ onSelect }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [prompts, setPrompts] = useState(null) // null = 아직 안 불러옴
  const [error, setError] = useState("")

  if (!user) return null

  // 처음 펼칠 때 한 번만 불러와요. (매번 열 때마다 요청하지 않게)
  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && prompts === null) {
      try {
        setPrompts(await listPrompts())
      } catch (err) {
        console.error(err)
        setError("소재함을 불러오지 못했어요.")
      }
    }
  }

  return (
    <div className="mps">
      <button type="button" className="btn" onClick={toggle} aria-expanded={open}>
        내 소재함에서 고르기 <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="mps-panel">
          {error && <p className="mps-empty">{error}</p>}
          {!error && prompts === null && <p className="mps-empty">불러오는 중…</p>}
          {prompts?.length === 0 && <p className="mps-empty">저장한 소재가 없어요. 소재를 뽑고 ☆를 눌러 저장해보세요.</p>}
          {prompts?.length > 0 && (
            <ul className="mps-list">
              {prompts.map((saved) => (
                <li key={saved.id}>
                  <button
                    type="button"
                    className="mps-item"
                    onClick={() => {
                      onSelect(saved.prompt)
                      setOpen(false)
                    }}
                  >
                    <span>{promptSummary(saved.prompt)}</span>
                    {saved.memo && <small>{saved.memo}</small>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// { genre: "추리", word: "붕어빵" } → "추리 · 붕어빵" (항목 순서는 장르→장소→… 고정)
// eslint-disable-next-line react/only-export-components
export const promptSummary = (prompt) =>
  STORY_PROMPT_CATEGORIES.filter((c) => prompt?.[c.key])
    .map((c) => prompt[c.key])
    .join(" · ")

export default MyPromptsSelect

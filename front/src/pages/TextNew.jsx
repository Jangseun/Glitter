import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { TEXT_CATEGORIES } from "../data/textCategories"
import { createText } from "../services/textsApi"
import BackButton from "../components/BackButton"
import "./TextNew.css"

const MAX_CONTENT = 500 // 백엔드(schemas/typing_text.py)와 같은 값

// 타자 연습 글 등록 페이지 (/typing/texts/new) — 로그인한 사람만 (App.jsx에서 RequireAuth로 감쌈)
const TextNew = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // 목록에서 "시" 탭을 보다가 들어왔으면 분류를 미리 "시"로 골라둬요.
  const initialCategory = TEXT_CATEGORIES.some((c) => c.key === searchParams.get("category"))
    ? searchParams.get("category")
    : "quote"

  const [category, setCategory] = useState(initialCategory)
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // 타자 화면은 한 줄로 치니까, 줄바꿈은 공백으로 바뀌어서 저장된다는 걸 미리 보여줘요. (서버도 똑같이 바꿔요)
  const normalized = content.split(/\s+/).filter(Boolean).join(" ")
  // 한글로 끝나면 마지막 글자를 Enter로 확정해야 해서 살짝 불편해요. 문장 부호로 끝나는 걸 추천
  const endsWithHangul = /[가-힣]$/.test(normalized)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (normalized.length < 5) {
      setError("글이 너무 짧아요. (5자 이상)")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      await createText({ category, title, author, content: normalized })
      // 등록한 분류의 목록으로 돌아가서 방금 올린 글을 바로 볼 수 있게
      navigate(`/typing/solo?category=${category}`)
    } catch (err) {
      console.error(err)
      setError(err.status ? err.message : "등록하지 못했어요. 잠시 후 다시 시도해주세요.")
      setIsSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <BackButton to="/typing/solo" label="글 목록으로" />
        <h1 className="page-title">좋은 글귀 등록하기</h1>
      </header>

      <form className="tn" onSubmit={handleSubmit}>
        <div className="tn-row">
          <span className="tn-label">분류</span>
          <div className="seg">
            {TEXT_CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`seg-btn${category === c.key ? " on" : ""}`}
                aria-pressed={category === c.key}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <label className="tn-row">
          <span className="tn-label">글</span>
          <textarea
            className="tn-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CONTENT}
            placeholder="함께 치고 싶은 문장을 적어주세요."
            autoFocus
          />
          <span className="tn-hint">
            {normalized.length} / {MAX_CONTENT}자 · 줄바꿈은 띄어쓰기로 바뀌어요
            {endsWithHangul && " · 마침표(.) 같은 문장 부호로 끝내면 치기 편해요"}
          </span>
        </label>

        <div className="tn-two">
          <label className="tn-row">
            <span className="tn-label">작품 제목 (선택)</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </label>
          <label className="tn-row">
            <span className="tn-label">지은이 (선택)</span>
            <input className="field" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={50} />
          </label>
        </div>

        <p className="tn-hint">
          다른 사람의 글을 올릴 땐 출처를 꼭 적어주세요. 저작권이 있는 긴 글은 짧은 인용 정도로만 올려주세요.
        </p>

        {error && <p className="tn-error">{error}</p>}

        <div>
          <button type="submit" className="btn primary" disabled={isSaving || normalized.length < 5}>
            {isSaving ? "등록 중…" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TextNew

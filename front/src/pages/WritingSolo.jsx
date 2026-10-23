import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import PromptCard from "../components/PromptCard"
import PromptPicker from "../components/PromptPicker"
import { isEmptyPrompt } from "../data/storyPrompts"
import { createWork } from "../services/worksApi"
import "./WritingSolo.css"

// 쓰던 글을 임시 저장해두는 localStorage 키.
// 새로고침하거나 실수로 페이지를 나가도 글이 날아가지 않게 하려는 용도예요.
// (작품 "저장"과는 별개. 저장 버튼을 누르면 작품 목록으로 들어가고 임시 저장은 지워져요)
const DRAFT_KEY = "glitter:draft:writing-solo"

// 임시 저장된 글 불러오기. 없거나 깨져 있으면 null
const loadDraft = () => {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY))
    return draft && (draft.title || draft.body) ? draft : null
  } catch {
    return null
  }
}

const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // 저장소 접근이 막힌 환경(사생활 보호 모드 등)이면 그냥 무시
  }
}

const WritingSolo = () => {
  const navigate = useNavigate()

  // 첫 렌더링 때 한 번만 임시 저장본을 읽어와요. (함수를 넘기면 첫 렌더링에만 실행됨)
  const [initialDraft] = useState(loadDraft)

  // 화면 단계:
  // "start" → 자유롭게 쓸지 / 랜덤 소재로 쓸지 고르는 첫 화면
  // "pick"  → 랜덤 소재 뽑는 화면
  // "write" → 실제로 글 쓰는 화면
  // 임시 저장본이 있으면 바로 "write"로 시작해서 이어 쓸 수 있게 해요.
  const [step, setStep] = useState(initialDraft ? "write" : "start")

  // 뽑은 소재 { genre: "추리", ... }. 자유 주제면 null
  const [prompt, setPrompt] = useState(initialDraft?.prompt ?? null)
  const [title, setTitle] = useState(initialDraft?.title ?? "")
  const [body, setBody] = useState(initialDraft?.body ?? "")

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // 글쓰기 화면에서 제목/본문/소재가 바뀔 때마다 임시 저장해요.
  // 글자 하나 칠 때마다 저장되지만, localStorage는 동기식이고 데이터가 작아서 성능 문제는 없어요.
  useEffect(() => {
    if (step !== "write") return
    try {
      if (title || body) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body, prompt }))
      } else {
        localStorage.removeItem(DRAFT_KEY)
      }
    } catch {
      // 저장 공간이 꽉 찼거나 접근이 막힌 경우. 임시 저장은 보조 기능이라 조용히 넘어가요.
    }
  }, [step, title, body, prompt])

  const startFree = () => {
    setPrompt(null)
    setStep("write")
  }

  const startWithPrompt = () => setStep("write")

  // 쓰던 걸 버리고 첫 화면으로. 내용이 있으면 한 번 물어봐요.
  const handleReset = () => {
    if ((title || body) && !window.confirm("쓰던 글이 사라져요. 처음으로 돌아갈까요?")) return
    clearDraft()
    setTitle("")
    setBody("")
    setPrompt(null)
    setError("")
    setStep("start")
  }

  const handleSave = async () => {
    if (!body.trim()) {
      setError("본문을 한 줄이라도 써주세요.")
      return
    }

    setIsSaving(true)
    setError("")
    try {
      // 지금은 localStorage 저장이라 실패할 일이 거의 없지만,
      // 나중에 서버 API로 바뀌면 네트워크 오류가 날 수 있어서 try/catch로 감싸 둬요.
      const work = await createWork({
        title: title.trim() || "제목 없는 이야기",
        body,
        mode: "solo",
        authors: [], // 로그인/닉네임 기능이 생기면 여기에 작성자를 넣어요
        prompt: isEmptyPrompt(prompt) ? null : prompt,
      })
      clearDraft()
      // 저장이 끝나면 방금 쓴 작품의 상세 페이지로 이동
      navigate(`/works/${work.id}`)
    } catch (err) {
      console.error(err)
      setError("저장하지 못했어요. 잠시 후 다시 시도해주세요.")
      setIsSaving(false)
    }
  }

  // 공백을 뺀 글자 수 (원고지 분량 감각에 더 가까워서 같이 보여줘요)
  const charCount = body.length
  const charCountNoSpace = body.replace(/\s/g, "").length

  return (
    <div className="page ws">
      <header className="page-header">
        <Link to="/" className="page-back">
          ← 홈
        </Link>
        <h1 className="page-title">혼자 이야기 쓰기</h1>
      </header>

      {step === "start" && (
        <div className="ws-start">
          <button type="button" className="ws-option" onClick={startFree}>
            <strong>자유롭게 쓰기</strong>
            <span>떠오르는 대로 바로 시작해요.</span>
          </button>
          <button type="button" className="ws-option" onClick={() => setStep("pick")}>
            <strong>랜덤 소재로 쓰기</strong>
            <span>장르, 장소, 인물… 뽑힌 소재로 이야기를 만들어요.</span>
          </button>
        </div>
      )}

      {step === "pick" && (
        <div className="ws-pick">
          <PromptPicker value={prompt} onChange={setPrompt} />
          <div className="ws-actions">
            <button type="button" className="btn" onClick={() => setStep("start")}>
              뒤로
            </button>
            <button type="button" className="btn primary" onClick={startWithPrompt} disabled={isEmptyPrompt(prompt)}>
              이 소재로 쓰기
            </button>
          </div>
        </div>
      )}

      {step === "write" && (
        <div className="ws-write">
          {!isEmptyPrompt(prompt) && <PromptCard prompt={prompt} body={body} />}

          <input
            className="ws-title"
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />

          {/*
            TypingSolo와 달리 여기는 일반적인 controlled textarea(value + onChange)로 써도 괜찮아요.
            TypingSolo는 maxLength/색칠 등으로 입력값을 계속 가공해서 조합이 깨졌지만,
            여기는 입력값을 그대로 state에 넣고 그대로 돌려주기만 해서 React가 조합을 방해하지 않아요.
          */}
          <textarea
            className="ws-body"
            placeholder="이야기를 시작해보세요."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
          />

          <div className="ws-footer">
            <span className="ws-count">
              {charCount.toLocaleString()}자 (공백 제외 {charCountNoSpace.toLocaleString()}자)
            </span>
            {error && <span className="ws-error">{error}</span>}
            <button type="button" className="btn" onClick={handleReset} disabled={isSaving}>
              처음으로
            </button>
            <button type="button" className="btn primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "저장 중…" : "완성하고 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WritingSolo

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import TextPicker from "../components/TextPicker"
import TypingBoard from "../components/TypingBoard"
import TypingResult from "../components/TypingResult"
import { CATEGORY_LABEL } from "../data/textCategories"
import { useAuth } from "../context/AuthContext"
import { useTypingSession } from "../hooks/useTypingSession"
import { saveRecord } from "../services/recordsApi"
import { randomText, textSource } from "../services/textsApi"
import BackButton from "../components/BackButton"
import "./TypingSolo.css"

// 결과 화면이 뜬 직후 이 시간(ms) 동안은 Enter/Esc 단축키를 무시해요.
// 이유: 일부 브라우저(Safari 등)에서는 마지막 글자를 Enter로 확정하면
// compositionend → (완료 처리 + 단축키 리스너 등록) → keydown(Enter) 순서로 이벤트가 와서,
// 결과 화면이 뜨자마자 "다음 글"로 넘어가 버리는 문제가 생길 수 있어요.
const SHORTCUT_GUARD_MS = 500

// 혼자 타자 연습 페이지 (/typing/solo)
//   1) 글 고르기 (TextPicker): 분류 탭 → 글 목록 → 하나 고르기 / 아무 글이나
//   2) 타자 치기 (TypingPractice)
//
// 지금 고른 분류는 주소(?category=poem)에 저장해요.
// 그러면 새로고침하거나 뒤로 가기를 해도 보던 분류가 유지되고, 등록 화면에서 돌아올 때도 그 분류로 와요.
const TypingSolo = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get("category") || "all"

  // 지금 치고 있는 글 (API 글 객체). null이면 글 고르기 화면
  const [current, setCurrent] = useState(null)
  // 연습을 새로 시작할 때마다 1씩 올리는 번호. TypingPractice의 key로 써요. (아래 주석 참고)
  const [practiceNo, setPracticeNo] = useState(0)

  const startPractice = (text) => {
    setCurrent(text)
    setPracticeNo((n) => n + 1)
  }

  // "다음 글": 같은 분류에서 방금 친 글을 뺀 나머지 중 무작위로 하나
  const goNext = async () => {
    try {
      startPractice(await randomText({ category, exclude: current?.id }))
    } catch {
      // 분류에 글이 하나뿐이면 다음 글이 없어서(404) 같은 글로 처음부터 다시 시작해요.
      startPractice(current)
    }
  }

  return (
    <div className="ts">
      <header className="ts-header">
        {/* 타자 치는 중에만 "글 목록으로" 화살표 (글 고르기 화면은 상단 바 메뉴로 이동) */}
        {current && <BackButton onClick={() => setCurrent(null)} label="글 목록으로" />}
        <h1 className="ts-title">혼자 타자 연습</h1>
        {current && <span className="badge">{CATEGORY_LABEL[current.category]}</span>}
      </header>

      {current ? (
        // key={practiceNo}: 새 글(또는 같은 글 다시)로 시작할 때마다 TypingPractice를 새로 만들어요.
        // 그러면 안의 useTypingSession 상태가 처음부터 다시 시작돼서 따로 reset할 필요가 없어요.
        <TypingPractice key={practiceNo} text={current} onNext={goNext} />
      ) : (
        <TextPicker
          category={category}
          onCategoryChange={(key) => setSearchParams(key === "all" ? {} : { category: key })}
          onPick={startPractice}
        />
      )}
    </div>
  )
}

// ---------- 타자 치기 화면 ----------
// 입력 처리(IME, 커서, 기록 측정)는 useTypingSession + TypingBoard가 담당하고,
// 여기서는 기록 바, 결과 화면, 단축키만 관리해요.
const TypingPractice = ({ text, onNext }) => {
  const content = text.content

  // 치는 도중 Esc를 누르면 처음부터 다시.
  // onEscape 안에서 session을 쓰는데, 이 화살표 함수는 "Esc를 누를 때" 실행되니까
  // 그때는 session이 이미 만들어져 있어서 괜찮아요.
  const session = useTypingSession(content, { onEscape: () => session.reset() })
  const { stats, isFinished, endTime, inputText, isComposing, confirmedLength } = session

  const restart = () => session.reset()

  // ---- 기록 저장 ----
  // 로그인한 상태로 한 판을 끝내면 서버에 기록을 남겨요. (설정 > 프로필의 성장 그래프에 쌓여요)
  // endTime을 의존성으로 둬서 "완료된 순간" 한 번만 실행돼요. 다시하기(reset)하면 endTime이 null로 돌아갔다가
  // 다시 다 치면 새 endTime이 생겨서 또 한 번 저장돼요.
  const { user } = useAuth()
  const [recordSaved, setRecordSaved] = useState(false)
  useEffect(() => {
    if (endTime === null || !user) return
    let ignore = false
    saveRecord({ mode: "solo", textId: text.id, category: text.category, stats, charCount: content.length })
      .then(() => !ignore && setRecordSaved(true))
      .catch((err) => console.error("기록 저장 실패", err)) // 기록 저장이 실패해도 연습 자체엔 지장 없게 조용히
    return () => {
      ignore = true
      setRecordSaved(false)
    }
    // stats/text는 완료 순간의 값만 필요해서 의존성에서 뺐어요. (매 렌더링마다 다시 저장되면 안 되니까)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime, user])

  // 단축키 리스너에서 쓸 "최신" restart/onNext 함수를 담아두는 ref.
  // 함수들은 렌더링마다 새로 만들어져서, 리스너가 등록될 때의 함수를 그대로 쓰면 옛날 값을 기준으로
  // 동작할 수 있어요. 그래서 매 렌더링 후 ref에 최신 함수를 넣어두고, 리스너는 실행 순간 꺼내 써요.
  const shortcutsRef = useRef({ restart, onNext })
  useEffect(() => {
    shortcutsRef.current = { restart, onNext }
  })

  // 완료 화면에서 Enter = 다음 글, Esc = 다시하기 단축키.
  // 완료 후엔 textarea가 disabled라서 키 입력을 못 받으니, window 전체에 리스너를 달아요.
  useEffect(() => {
    if (endTime === null) return

    const handleShortcut = (e) => {
      if (Date.now() - endTime < SHORTCUT_GUARD_MS) return // 위의 SHORTCUT_GUARD_MS 주석 참고
      // 결과 화면의 버튼에 포커스가 있을 때 Enter를 누르면 버튼 클릭도 같이 일어나서
      // 두 번 넘어가게 되므로, 버튼에 포커스가 있을 땐 버튼에 맡겨요.
      if (e.target instanceof HTMLButtonElement) return

      if (e.key === "Enter") {
        e.preventDefault()
        shortcutsRef.current.onNext()
      } else if (e.key === "Escape") {
        e.preventDefault()
        shortcutsRef.current.restart()
      }
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [endTime])

  // 마지막 글자를 조합 중이면 IME가 확정을 안 해줘서 완료가 안 돼요. Enter로 확정하라고 안내해요.
  const isLastCharComposing = isComposing && confirmedLength === content.length - 1

  return (
    <>
      {/* 실시간 기록 바 */}
      <div className="ts-stats">
        <span>
          <b>{stats.speed}</b> 타/분
        </span>
        <span>
          <b>{stats.accuracy}</b> %
        </span>
        <span>
          오타 <b>{stats.typoCount}</b>
        </span>
        <span>
          <b>{stats.seconds.toFixed(1)}</b> 초
        </span>
      </div>
      <div className="ts-progress">
        <div className="ts-progress-bar" style={{ width: `${stats.progress * 100}%` }} />
      </div>

      <TypingBoard session={session} />

      <p className="ts-source">
        {textSource(text) || "작자 미상"}
        {text.uploader && ` · ${text.uploader}님이 등록`}
      </p>

      {isFinished ? (
        <TypingResult
          stats={stats}
          onRestart={restart}
          onNext={onNext}
          note={user ? (recordSaved ? "기록을 저장했어요 · 설정 > 프로필에서 성장 그래프를 볼 수 있어요" : "") : "로그인하면 기록이 저장돼요"}
        />
      ) : (
        <div className="ts-footer">
          <span>
            {inputText.length} / {content.length}
          </span>
          <span className="ts-hint">
            {isLastCharComposing ? "마지막 글자예요. Enter를 눌러 마무리하세요." : "Esc 처음부터"}
          </span>
          <button type="button" className="ts-skip" onClick={onNext}>
            다른 글
          </button>
        </div>
      )}
    </>
  )
}

export default TypingSolo

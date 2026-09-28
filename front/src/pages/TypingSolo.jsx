import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import TypingResult from "../components/TypingResult"
import { pickRandomSentence } from "../data/typingSentences"
import { calcTypingStats } from "../utils/typingStats"
import "./TypingSolo.css"

// 방향키/Home/End로 textarea 안의 진짜 커서(caret)를 옮기지 못하게 막을 키 목록
const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]

// 결과 화면이 뜬 직후 이 시간(ms) 동안은 Enter/Esc 단축키를 무시해요.
// 이유: 일부 브라우저(Safari 등)에서는 마지막 글자를 Enter로 확정하면
// compositionend → (완료 처리 + 단축키 리스너 등록) → keydown(Enter) 순서로 이벤트가 와서,
// 결과 화면이 뜨자마자 "다음 문장"으로 넘어가 버리는 문제가 생길 수 있어요.
const SHORTCUT_GUARD_MS = 500

const TypingSolo = () => {
  // 지금 연습 중인 문장 객체 { id, text, source }
  // useState에 함수를 넘기면 첫 렌더링 때만 실행돼요. (매 렌더링마다 새 문장을 뽑지 않도록)
  const [sentence, setSentence] = useState(() => pickRandomSentence())
  const text = sentence.text

  // 확정된(조합이 끝난) 글자 전체. 조합 중인 글자는 여기 안 들어있어요.
  // 화면에 뭘 그릴지 결정하는 용도로만 쓰고, textarea의 실제 값을 이 state로
  // 강제로 되돌리지는 않아요. (아래 textarea의 defaultValue 관련 주석 참고)
  const [inputText, setInputText] = useState("")

  // 지금 조합 중인 글자를 그대로 보여주기 위한 state (ㅎ, 하, 한...)
  // compositionupdate 이벤트가 줄 때마다 갱신됩니다.
  const [liveComposingText, setLiveComposingText] = useState("")

  // 지금 한글 조합 중인지 (예: 아직 'ㅎ'만 친 상태인지)
  // 조합이 끝나기 전까지는 "맞았다/틀렸다" 판정을 미루기 위해 씁니다.
  const [isComposing, setIsComposing] = useState(false)

  // ---- 기록 측정용 state ----
  // startTime: 첫 입력 순간의 시각(ms). 아직 시작 안 했으면 null
  // endTime:   문장을 끝까지 친 순간의 시각(ms). 아직 안 끝났으면 null → 이 값이 있으면 "완료 상태"
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)

  // 실시간 타이머 표시용 "현재 시각". 타자 치는 동안에만 0.2초마다 갱신돼요.
  // 렌더링 중에 Date.now()를 직접 부르면 React 입장에서 "순수하지 않은" 렌더링이 되기 때문에
  // 시간을 state로 들고 있다가 그 값으로 계산합니다.
  const [now, setNow] = useState(0)

  // typedCount: 확정된 글자의 누적 개수 (지우고 다시 친 것도 전부 포함)
  // typoCount:  그중 확정되는 순간 정답과 달랐던 글자의 누적 개수
  // → 정확도 = (typedCount - typoCount) / typedCount
  const [typedCount, setTypedCount] = useState(0)
  const [typoCount, setTypoCount] = useState(0)

  // 조합을 "시작"한 시점에 이미 확정돼있던 글자 수. (= 조합 중인 글자가 들어갈 자리 번호)
  // 예전엔 useRef였는데, 렌더링 중에 ref.current를 읽으면 React가 화면 갱신을 보장하지 않아서
  // state로 바꿨어요. 항상 setIsComposing(true)와 같이 바뀌므로 렌더링 횟수는 늘지 않아요.
  const [composeStartIndex, setComposeStartIndex] = useState(0)

  // textarea에 포커스가 있는지. 포커스를 잃으면 "클릭해서 계속하기" 안내를 보여줘요.
  // 첫 화면에서 안내가 한 번 깜빡이지 않도록 true로 시작해요. (마운트 직후 바로 포커스를 주니까)
  const [isFocused, setIsFocused] = useState(true)

  // 다시하기/다음 문장을 할 때마다 1씩 올라가는 회차 번호.
  // 이 값이 바뀌면 아래 useEffect가 textarea에 다시 포커스를 줘요.
  const [round, setRound] = useState(0)

  // 화면엔 안 보이지만 실제 키보드 입력을 받는 textarea를 가리키는 ref
  const inputRef = useRef(null)

  // 직전에 확정된 문자열. 새로 확정된 값과 비교해서 "새로 추가된 글자"가 뭔지 알아내는 데 써요.
  // state(inputText)가 아니라 ref를 쓰는 이유: 이벤트가 연달아 올 때 state는 아직
  // 다음 렌더링 전이라 옛날 값일 수 있지만, ref는 항상 방금 넣은 최신 값을 돌려주기 때문이에요.
  const committedRef = useRef("")

  // isComposing state와 같은 값이지만, 렌더링을 기다리지 않고 즉시 읽어야 하는 곳
  // (onSelect에서 커서 위치를 강제로 옮길 때)에서 쓰는 ref 버전이에요.
  const isComposingRef = useRef(false)

  const isFinished = endTime !== null

  // 새로 확정된 textarea 값을 반영하는 함수. (handleChange / handleCompositionEnd 둘 다 여기로 옴)
  // 1) 새로 추가된 글자마다 정답과 비교해서 오타 누적
  // 2) 첫 입력이면 시작 시간 기록
  // 3) 문장 길이만큼 다 쳤으면 종료 시간 기록
  const commitValue = (value) => {
    const prev = committedRef.current
    committedRef.current = value

    // 이전보다 길어진 부분 = 이번에 새로 확정된 글자들.
    // (짧아졌다면 백스페이스로 지운 것이니 셀 게 없음)
    // 이미 확정된 앞부분이 나중에 바뀌는 경우는 없어요. 한글 IME는 "안" + "ㅏ" 같은 경우에도
    // "안"을 확정하지 않고 조합 중인 채로 두었다가 "아" + "나"로 나눠서 확정하기 때문이에요.
    let added = 0
    let typos = 0
    for (let i = prev.length; i < value.length; i++) {
      added++
      if (value[i] !== text[i]) typos++
    }
    if (added > 0) {
      setTypedCount((c) => c + added)
      setTypoCount((c) => c + typos)
    }

    if (value.length > 0) {
      // 이미 시작했으면 기존 값을 유지(??)하고, 처음이면 지금 시각을 기록
      setStartTime((t) => t ?? Date.now())
    }
    if (value.length >= text.length) {
      setEndTime(Date.now())
    }

    setInputText(value)
  }

  // 조합 중이 아닐 때만 state를 갱신해요.
  // 조합 중에도 여기서 계속 state를 갱신하면, 조합 중인 낱자(ㅎ 등)가 "확정된 글자"로 취급돼서
  // 오타로 잘못 세지거나 화면 표시가 꼬여요.
  // e.nativeEvent.isComposing은 브라우저가 직접 알려주는 조합 여부라서 이중 안전장치로 같이 확인해요.
  const handleChange = (e) => {
    if (isComposing || e.nativeEvent.isComposing) return
    commitValue(e.target.value)
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
    setIsComposing(true)
    setComposeStartIndex(committedRef.current.length) // 지금까지 확정된 글자 수를 얼려둠
    setLiveComposingText("")
    // 한글은 첫 자모(ㅎ)를 누르는 순간부터 조합이 시작되니까, 여기서 시작 시간을 찍어야
    // "첫 글자를 누른 순간"부터 정확히 측정돼요.
    setStartTime((t) => t ?? Date.now())
  }

  // 조합 중인 글자가 바뀔 때마다(ㅎ → 하 → 한) 무조건 호출되는, 가장 믿을 수 있는 이벤트예요.
  // e.data가 그 순간의 조합 글자를 바로 알려줘요. (반대로 e.target.value는
  // 브라우저 내부적으로 한 박자 늦게 갱신되는 경우가 있어서, 그걸 읽으면 한 글자씩 밀려 보여요)
  const handleCompositionUpdate = (e) => {
    setLiveComposingText(e.data)
  }

  // 조합이 "끝난" 이 순간에만 최종 확정된 값을 state에 반영해요.
  const handleCompositionEnd = (e) => {
    isComposingRef.current = false
    setIsComposing(false)
    setLiveComposingText("")
    commitValue(e.target.value)
  }

  // 모든 입력 관련 상태를 처음으로 되돌려요. (새로고침 없이 다시하기)
  // nextSentence를 넘기면 그 문장으로 바꾸고, 안 넘기면 같은 문장으로 다시 합니다.
  const resetRound = (nextSentence = sentence) => {
    // textarea는 defaultValue만 쓰는 "비제어" 컴포넌트라서 state를 비워도 실제 값은 안 지워져요.
    // 그래서 DOM에 직접 접근해서 값을 비워줘야 합니다.
    if (inputRef.current) inputRef.current.value = ""
    committedRef.current = ""
    isComposingRef.current = false

    setSentence(nextSentence)
    setInputText("")
    setLiveComposingText("")
    setIsComposing(false)
    setComposeStartIndex(0)
    setStartTime(null)
    setEndTime(null)
    setTypedCount(0)
    setTypoCount(0)
    setRound((r) => r + 1)
  }

  const handleRestart = () => resetRound()
  const handleNext = () => resetRound(pickRandomSentence(sentence.id))

  const handleClick = () => inputRef.current?.focus()

  const handleKeyDown = (e) => {
    // 한글 조합 중일 땐 키 입력을 IME에 맡겨요. (Enter로 마지막 글자를 확정하는 경우 등)
    if (isComposing || e.nativeEvent.isComposing) return

    // 방향키 등으로 커서를 문장 중간으로 옮기지 못하게 막아요.
    // 타자 게임에서는 입력 위치가 항상 맨 끝이어야 하는데, 방향키를 누르면
    // textarea 안의 진짜 커서(caret)가 중간으로 이동해서 화면 표시와 어긋나 버려요.
    if (NAVIGATION_KEYS.includes(e.key)) {
      e.preventDefault()
      return
    }

    // 연습 문장은 한 줄짜리 글이라서 줄바꿈 문자가 들어가면 안 돼요.
    // (긴 문장은 화면 너비에 맞춰 CSS가 알아서 줄바꿈해줘요)
    if (e.key === "Enter") {
      e.preventDefault()
      return
    }

    // 치는 도중 Esc를 누르면 처음부터 다시 시작
    if (e.key === "Escape") {
      e.preventDefault()
      handleRestart()
      return
    }

    // Ctrl+A(전체 선택) 후 입력하면 textarea 내용이 통째로 바뀌고,
    // Ctrl+Z/Y(실행 취소/재실행)는 값을 예측할 수 없게 되돌려서 화면과 데이터가 어긋나요.
    const isShortcut = e.ctrlKey || e.metaKey
    if (isShortcut && ["a", "z", "y"].includes(e.key.toLowerCase())) {
      e.preventDefault()
    }
  }

  // 방향키를 막아도, 한글 조합 중에 방향키를 누르면 브라우저가 "조합 확정 + 커서 이동"을 해버려요.
  // (조합 중엔 handleKeyDown에서 막지 않으니까요)
  // 그래서 커서(선택 영역)가 바뀔 때마다 확인해서, 맨 끝이 아니면 맨 끝으로 되돌려요.
  // 단, 조합 중에 커서를 건드리면 IME 조합이 깨지므로 조합 중엔 절대 건드리지 않아요.
  const handleSelect = () => {
    const el = inputRef.current
    if (!el || isComposingRef.current) return
    const end = el.value.length
    if (el.selectionStart !== end || el.selectionEnd !== end) {
      el.setSelectionRange(end, end)
    }
  }

  // 붙여넣기 / 드래그해서 끌어놓기로 문장을 한 번에 넣는 걸 막아요.
  const preventInsert = (e) => e.preventDefault()

  // 처음 들어왔을 때 + 다시하기/다음 문장을 할 때마다 바로 입력 가능하도록 포커스를 줘요.
  // (완료 상태에선 textarea가 disabled라서 포커스가 풀려있으므로, 리셋 후 다시 잡아줘야 함)
  useEffect(() => {
    inputRef.current?.focus()
  }, [round])

  // 타자를 치는 동안에만 0.2초마다 현재 시각을 갱신해서 시간/타수가 실시간으로 바뀌게 해요.
  // 시작 전이나 완료 후에는 타이머를 돌리지 않아요.
  // return으로 돌려주는 함수(cleanup)는 startTime/endTime이 바뀌거나 페이지를 떠날 때 실행돼서
  // 이전 타이머를 정리해줘요. 안 그러면 타이머가 계속 쌓여요.
  useEffect(() => {
    if (startTime === null || endTime !== null) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [startTime, endTime])

  // 완료 화면에서 Enter = 다음 문장, Esc = 다시하기 단축키.
  // 완료 후엔 textarea가 disabled라서 키 입력을 못 받으니, window 전체에 리스너를 달아요.
  // sentence를 의존성에 넣은 이유: handleNext/handleRestart가 현재 문장을 기준으로 동작하기 때문에
  // 문장이 바뀌면 최신 함수로 리스너를 다시 등록해야 해요.
  useEffect(() => {
    if (endTime === null) return

    const handleShortcut = (e) => {
      if (Date.now() - endTime < SHORTCUT_GUARD_MS) return // 위의 SHORTCUT_GUARD_MS 주석 참고
      // 결과 화면의 버튼에 포커스가 있을 때 Enter를 누르면 버튼 클릭도 같이 일어나서
      // 두 번 넘어가게 되므로, 버튼에 포커스가 있을 땐 버튼에 맡겨요.
      if (e.target instanceof HTMLButtonElement) return

      if (e.key === "Enter") {
        e.preventDefault()
        resetRound(pickRandomSentence(sentence.id))
      } else if (e.key === "Escape") {
        e.preventDefault()
        resetRound(sentence)
      }
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
    // resetRound는 매 렌더링마다 새로 만들어지지만 내부 동작은 sentence에만 의존해서 의존성에서 제외했어요.
  }, [endTime, sentence])

  // 지금 몇 번째 글자까지 "확정"됐다고 볼지 계산해요.
  // 조합 중이면 조합 시작 시점에 얼려둔 값을, 아니면 실시간 inputText 길이를 사용해요.
  const confirmedLength = isComposing ? composeStartIndex : inputText.length

  // 경과 시간: 완료됐으면 종료 시각 기준, 치는 중이면 타이머가 갱신하는 now 기준
  // (시작 직후엔 now가 아직 갱신 전이라 음수가 될 수 있어서 0 밑으로 안 내려가게 막음)
  const elapsedMs = startTime === null ? 0 : Math.max(0, (endTime ?? now) - startTime)

  const stats = calcTypingStats({ target: text, typed: inputText, elapsedMs, typedCount, typoCount })

  // 마지막 글자를 조합 중이면 IME가 확정을 안 해줘서 완료가 안 돼요. Enter로 확정하라고 안내해요.
  const isLastCharComposing = isComposing && confirmedLength === text.length - 1

  return (
    <div className="ts">
      <header className="ts-header">
        <Link to="/" className="ts-back">
          ← 홈
        </Link>
        <h1 className="ts-title">혼자 타자 연습</h1>
      </header>

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

      <div className={`ts-board${isFocused || isFinished ? "" : " blurred"}`} onClick={handleClick}>
        <div className="ts-text">
          {text.split("").map((char, index) => {
            // 지금 조합 중인 글자가 들어갈 자리인지 (confirmedLength번째 자리)
            const isComposingHere = isComposing && index === confirmedLength

            // 커서는 항상 "확정된 글자 바로 뒤" = confirmedLength 위치에 그려요.
            // 포커스를 잃었을 땐 입력이 안 되니 커서도 숨겨요.
            const isCursorHere = isFocused && index === confirmedLength

            let display = char // 기본으로는 항상 정답 글자를 보여줘요
            let state = "" // CSS 클래스: ""(아직 안 친 글자) / ok / bad / bad-space / composing

            if (isComposingHere) {
              // 지금 조합 중인 글자는 맞았는지 판정하지 않고,
              // compositionupdate가 알려준 실제 모습(ㅎ, 하, 한...) 그대로 보여줘요.
              display = liveComposingText || char
              state = "composing"
            } else if (index < confirmedLength) {
              // 이미 확정된 글자는 정답과 비교해서 맞았는지/틀렸는지 색칠해요.
              const typedChar = inputText[index]
              if (typedChar === char) {
                state = "ok"
              } else if (typedChar === " ") {
                // 스페이스를 잘못 눌렀을 땐(원래 스페이스가 아닌 자리인데) 표시할 방법이 없어요.
                // 스페이스는 눈에 보이는 획이 없어서 빨간색을 칠해도 안 보이거든요.
                // 그래서 정답 글자를 그대로 보여주되, 빨간 배경을 깔아서 "여기 잘못 눌렀다"를 표시해요.
                state = "bad-space"
              } else {
                // 틀렸을 땐 정답 글자 말고, 내가 실제로 친 글자를 보여줘요.
                // (예: "안"을 쳐야 하는데 "앙"을 쳤다면 "앙"이 빨간색으로 보여요)
                display = typedChar
                state = char === " " ? "bad bad-space" : "bad" // 스페이스 자리에 글자를 친 경우도 배경 표시
              }
            }

            return (
              <span key={index} className={`ch ${state}`}>
                {display}
                {/* 조합 중이면 글자 오른쪽 끝에, 아니면 글자 왼쪽에 커서를 그려요. */}
                {isCursorHere && <span className={`caret${isComposing ? " after" : ""}`} />}
              </span>
            )
          })}
        </div>

        {/*
          실제 키보드 입력을 받는 textarea예요. 문장 영역 위에 투명하게 겹쳐 둡니다.
          - 크기를 1px처럼 거의 없애면 일부 Windows IME가 한글 조합을 이상하게 처리해서,
            크기는 정상적으로 주고 글자/커서만 투명하게 만들었어요. (VS Code 등도 쓰는 방식)
          - value 대신 defaultValue를 쓰는 "비제어" 방식이에요. value={inputText}로 묶으면
            React가 조합 중에도 값을 다시 써넣으면서 한글 조합이 깨져요. 절대 value로 바꾸지 마세요!
          - key={round}: 다시하기 때마다 textarea를 새로 만들어서 브라우저 내부의
            실행 취소 기록 같은 찌꺼기가 남지 않게 해요.
        */}
        <textarea
          key={round}
          ref={inputRef}
          className="ts-input"
          defaultValue=""
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          onPaste={preventInsert}
          onDrop={preventInsert}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={text.length}
          disabled={isFinished}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
        />

        {!isFocused && !isFinished && <div className="ts-overlay">클릭하면 이어서 칠 수 있어요</div>}
      </div>

      <p className="ts-source">{sentence.source}</p>

      {isFinished ? (
        <TypingResult stats={stats} onRestart={handleRestart} onNext={handleNext} />
      ) : (
        <div className="ts-footer">
          <span>
            {inputText.length} / {text.length}
          </span>
          <span className="ts-hint">
            {isLastCharComposing ? "마지막 글자예요. Enter를 눌러 마무리하세요." : "Esc 처음부터"}
          </span>
          <button type="button" className="ts-skip" onClick={handleNext}>
            다른 문장
          </button>
        </div>
      )}
    </div>
  )
}

export default TypingSolo

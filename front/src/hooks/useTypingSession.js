import { useEffect, useRef, useState } from "react"
import { calcTypingStats } from "../utils/typingStats"

// 방향키/Home/End로 textarea 안의 진짜 커서(caret)를 옮기지 못하게 막을 키 목록
const NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]

// 타자 입력 한 판의 "상태 + 입력 처리 로직"을 담은 커스텀 hook.
// 혼자 연습(TypingSolo)과 친구 대결(TypingBattleRoom)이 똑같은 입력 로직을 쓰도록 분리했어요.
// 화면 그리기는 TypingBoard 컴포넌트가 하고, 이 hook은 상태와 이벤트 처리만 담당해요.
//
// 사용법:
//   const session = useTypingSession(text, { disabled, onEscape })
//   <TypingBoard session={session} />
//   session.stats / session.isFinished / session.reset() 등을 꺼내 써요.
//
// text:     연습할 문장
// disabled: true면 입력을 막아요 (대결에서 카운트다운 중일 때 등)
// onEscape: 치는 도중 Esc를 눌렀을 때 실행할 함수 (혼자 연습: 처음부터 다시)
export const useTypingSession = (text, { disabled = false, onEscape } = {}) => {
  // 확정된(조합이 끝난) 글자 전체. 조합 중인 글자는 여기 안 들어있어요.
  // 화면에 뭘 그릴지 결정하는 용도로만 쓰고, textarea의 실제 값을 이 state로
  // 강제로 되돌리지는 않아요. (TypingBoard의 textarea defaultValue 관련 주석 참고)
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

  // 조합을 "시작"한 시점에 이미 확정돼있던 글자 수. (= 조합 중인 글자가 들어갈 자리 번호)
  // 렌더링 중에 ref.current를 읽으면 React가 화면 갱신을 보장하지 않아서 state로 둬요.
  // 항상 setIsComposing(true)와 같이 바뀌므로 렌더링 횟수는 늘지 않아요.
  const [composeStartIndex, setComposeStartIndex] = useState(0)

  // textarea에 포커스가 있는지. 포커스를 잃으면 "클릭해서 계속하기" 안내를 보여줘요.
  // 첫 화면에서 안내가 한 번 깜빡이지 않도록 true로 시작해요. (마운트 직후 바로 포커스를 주니까)
  const [isFocused, setIsFocused] = useState(true)

  // reset()할 때마다 1씩 올라가는 회차 번호.
  // TypingBoard가 이 값을 textarea의 key로 써서, 리셋할 때마다 textarea를 새로 만들어요.
  // 그리고 이 값이 바뀌면 아래 useEffect가 textarea에 다시 포커스를 줘요.
  const [round, setRound] = useState(0)

  // 화면엔 안 보이지만 실제 키보드 입력을 받는 textarea를 가리키는 ref
  const inputRef = useRef(null)

  // 직전에 확정된 문자열 (조합이 시작될 때 "지금까지 몇 글자 확정됐는지" 알아내는 데 써요)
  // state(inputText)가 아니라 ref를 쓰는 이유: 이벤트가 연달아 올 때 state는 아직
  // 다음 렌더링 전이라 옛날 값일 수 있지만, ref는 항상 방금 넣은 최신 값을 돌려주기 때문이에요.
  const committedRef = useRef("")

  // isComposing state와 같은 값이지만, 렌더링을 기다리지 않고 즉시 읽어야 하는 곳
  // (onSelect에서 커서 위치를 강제로 옮길 때)에서 쓰는 ref 버전이에요.
  const isComposingRef = useRef(false)

  const isFinished = endTime !== null

  // 새로 확정된 textarea 값을 반영하는 함수. (handleChange / handleCompositionEnd 둘 다 여기로 옴)
  // 1) 첫 입력이면 시작 시간 기록
  // 2) 문장 길이만큼 다 쳤으면 종료 시간 기록
  // (오타/정확도는 따로 세지 않고, utils/typingStats.js가 "지금 입력값 vs 정답"을 비교해서 계산해요)
  const commitValue = (value) => {
    committedRef.current = value

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
  // 문장을 바꾸는 건 이 hook을 쓰는 쪽에서 text를 바꿔서 넘겨주면 돼요.
  const reset = () => {
    // textarea는 defaultValue만 쓰는 "비제어" 컴포넌트라서 state를 비워도 실제 값은 안 지워져요.
    // 그래서 DOM에 직접 접근해서 값을 비워줘야 합니다.
    if (inputRef.current) inputRef.current.value = ""
    committedRef.current = ""
    isComposingRef.current = false

    setInputText("")
    setLiveComposingText("")
    setIsComposing(false)
    setComposeStartIndex(0)
    setStartTime(null)
    setEndTime(null)
    setRound((r) => r + 1)
  }

  const focus = () => inputRef.current?.focus()

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

    if (e.key === "Escape") {
      e.preventDefault()
      onEscape?.()
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

  // 처음 들어왔을 때 + reset할 때마다 + 입력이 다시 허용될 때(대결 시작) 바로 칠 수 있게 포커스를 줘요.
  // (완료 상태나 disabled 상태에선 textarea가 disabled라서 포커스가 풀려있으므로 다시 잡아줘야 함)
  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [round, disabled])

  // 타자를 치는 동안에만 0.2초마다 현재 시각을 갱신해서 시간/타수가 실시간으로 바뀌게 해요.
  // 시작 전이나 완료 후에는 타이머를 돌리지 않아요.
  // return으로 돌려주는 함수(cleanup)는 startTime/endTime이 바뀌거나 화면을 떠날 때 실행돼서
  // 이전 타이머를 정리해줘요. 안 그러면 타이머가 계속 쌓여요.
  useEffect(() => {
    if (startTime === null || endTime !== null) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [startTime, endTime])

  // 지금 몇 번째 글자까지 "확정"됐다고 볼지 계산해요.
  // 조합 중이면 조합 시작 시점에 얼려둔 값을, 아니면 실시간 inputText 길이를 사용해요.
  const confirmedLength = isComposing ? composeStartIndex : inputText.length

  // 경과 시간: 완료됐으면 종료 시각 기준, 치는 중이면 타이머가 갱신하는 now 기준
  // (시작 직후엔 now가 아직 갱신 전이라 음수가 될 수 있어서 0 밑으로 안 내려가게 막음)
  const elapsedMs = startTime === null ? 0 : Math.max(0, (endTime ?? now) - startTime)

  const stats = calcTypingStats({ target: text, typed: inputText, elapsedMs })

  return {
    text,
    disabled,
    inputRef,
    inputText,
    liveComposingText,
    isComposing,
    confirmedLength,
    isFocused,
    isFinished,
    endTime,
    stats,
    round,
    reset,
    focus,
    // textarea에 그대로 펼쳐서(...) 넣을 이벤트 핸들러 묶음
    inputHandlers: {
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onSelect: handleSelect,
      onCompositionStart: handleCompositionStart,
      onCompositionUpdate: handleCompositionUpdate,
      onCompositionEnd: handleCompositionEnd,
      onPaste: preventInsert,
      onDrop: preventInsert,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    },
  }
}

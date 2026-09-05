import { useEffect, useRef, useState } from "react"

// 연습할 글 전체를 문장 하나로 이어붙였어요.
// 여러 페이지로 안 나누고, 이 글 하나를 처음부터 끝까지 쭉 칩니다.
const PRACTICE_TEXT =
  "안녕하세요! 너무 반가워요!"

const TypingSolo = () => {
  // 확정된(조합이 끝난) 글자 전체. 조합 중인 글자는 여기 안 들어있어요.
  // 화면에 뭘 그릴지 결정하는 용도로만 쓰고, textarea의 실제 값을 이 state로
  // 강제로 되돌리지는 않아요. (아래 textarea의 value 관련 주석 참고)
  const [inputText, setInputText] = useState("")

  // 지금 조합 중인 글자를 그대로 보여주기 위한 state (ㅎ, 하, 한...)
  // compositionupdate 이벤트가 줄 때마다 갱신됩니다.
  const [liveComposingText, setLiveComposingText] = useState("")

  // 지금 한글 조합 중인지 (예: 아직 'ㅎ'만 친 상태인지)
  // 조합이 끝나기 전까지는 "맞았다/틀렸다" 판정을 미루기 위해 씁니다.
  const [isComposing, setIsComposing] = useState(false)

  // 화면엔 안 보이지만 실제 키보드 입력을 받는 textarea를 가리키는 ref
  const inputRef = useRef(null)

  // 조합을 "시작"한 시점에 이미 확정돼있던 글자 수를 기억해두는 곳.
  // useState 대신 useRef를 쓰는 이유: 이 값 자체가 바뀐다고 화면을 다시 그릴 필요는 없고,
  // 그냥 값만 기억해뒀다가 렌더링할 때 꺼내 쓰면 되기 때문이에요.
  const confirmedLengthRef = useRef(0)

  const isFinished = inputText.length >= PRACTICE_TEXT.length

  // 조합 중이 아닐 때만 state를 갱신해요.
  // 조합 중에도 여기서 setInputText를 계속 부르면, React가 그 값을 다시 textarea에
  // 억지로 써넣으면서(제어 컴포넌트라서) 브라우저가 진행 중이던 한글 조합을 깨뜨려버려요.
  // (실제로 로그에서 낱자가 남거나 사라지는 걸로 확인된 문제예요)
  const handleChange = (e) => {
    if (isComposing) return
    setInputText(e.target.value)
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
    confirmedLengthRef.current = inputText.length // 지금까지 확정된 글자 수를 얼려둠
    setLiveComposingText("")
  }

  // 조합 중인 글자가 바뀔 때마다(ㅎ → 하 → 한) 무조건 호출되는, 가장 믿을 수 있는 이벤트예요.
  // e.data가 그 순간의 조합 글자를 바로 알려줘요. (반대로 e.target.value는
  // 브라우저 내부적으로 한 박자 늦게 갱신되는 경우가 있어서, 그걸 읽으면 한 글자씩 밀려 보여요)
  const handleCompositionUpdate = (e) => {
    setLiveComposingText(e.data)
  }

  // 조합이 "끝난" 이 순간에만 최종 확정된 값을 state에 반영해요.
  const handleCompositionEnd = (e) => {
    setInputText(e.target.value)
    setIsComposing(false)
    setLiveComposingText("")
  }

  const handleClick = () => inputRef.current?.focus()

  // 방향키 등으로 커서를 문장 중간으로 옮기지 못하게 막아요.
  // 타자 게임에서는 입력 위치가 항상 맨 끝이어야 하는데, 방향키를 누르면
  // textarea 안의 진짜 커서(caret)가 중간으로 이동해서 화면 표시와 어긋나 버려요.
  const handleKeyDown = (e) => {
    // 한글 조합 중일 땐 방향키를 후보 선택 등에 쓸 수도 있으니 막지 않아요.
    if (isComposing) return

    const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]
    if (navigationKeys.includes(e.key)) {
      e.preventDefault()
    }
  }

  // 페이지에 들어오면 바로 입력 가능하도록 포커스를 줘요.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 지금 몇 번째 글자까지 "확정"됐다고 볼지 계산해요.
  // 조합 중이면 조합 시작 시점에 얼려둔 값을, 아니면 실시간 inputText 길이를 사용해요.
  const confirmedLength = isComposing ? confirmedLengthRef.current : inputText.length

  return (
    <div style={{ padding: "40px 0" }}>
      {/* 커서가 깜빡이는 애니메이션 정의 */}
      <style>
        {`
          @keyframes blink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
          /* 드래그로 글자를 선택해도 하이라이트/글자가 안 보이게 (이중 안전장치) */
          .typing-hidden-input::selection {
            background: transparent;
            color: transparent;
          }
        `}
      </style>

      <h1>Typing Solo</h1>

      <div
        onClick={handleClick}
        style={{
          position: "relative", // 안에 들어갈 textarea를 이 영역 기준으로 깔아주기 위해
          cursor: "text",
          textAlign: "left",
          fontSize: "28px",
          lineHeight: "1.9",
          // pre-wrap: 스페이스/줄바꿈을 그대로 유지하면서, 화면 너비에 맞춰 자동 줄바꿈도 해줘요.
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
        }}
      >
        {PRACTICE_TEXT.split("").map((char, index) => {
          // 지금 조합 중인 글자가 들어갈 자리인지 (confirmedLength번째 자리)
          const isComposingHere = isComposing && index === confirmedLength

          // 커서는 항상 "확정된 글자 바로 뒤" = confirmedLength 위치에 그려요.
          const isCursorHere = index === confirmedLength

          let display = char // 기본으로는 항상 정답 글자를 보여줘요
          let color = "var(--text)" // 아직 안 친 글자: 회색

          if (isComposingHere) {
            // 지금 조합 중인 글자는 맞았는지 판정하지 않고,
            // compositionupdate가 알려준 실제 모습(ㅎ, 하, 한...) 그대로,
            // 확정된 글자랑 똑같은 기본 텍스트 색으로 보여줘요.
            display = liveComposingText || char
            color = "var(--text-h)"
          } else if (index < confirmedLength) {
            // 이미 확정된 글자는 정답과 비교해서 맞았는지/틀렸는지 색칠해요.
            const typedChar = inputText[index]
            if (typedChar === char) {
              color = "var(--text-h)"
            } else {
              // 틀렸을 땐 정답 글자 말고, 내가 실제로 친 글자를 보여줘요.
              // (예: "안"을 쳐야 하는데 "ㅇ"만 쳤다면, "안"이 아니라 "ㅇ"이 빨간색으로 보여요)
              display = typedChar
              color = "#e5484d"
            }
          }

          return (
            <span key={index} style={{ color, position: "relative" }}>
              {display}

              {isCursorHere && (
                <span
                  style={{
                    position: "absolute",
                    // 조합 중이면 글자 오른쪽 끝에, 아니면 글자 왼쪽에 커서를 그려요.
                    left: isComposing ? "100%" : 0,
                    top: "0.1em",
                    width: "2px",
                    height: "1.2em",
                    backgroundColor: "var(--text-h)",
                    animation: "blink 1s step-start infinite",
                  }}
                />
              )}
            </span>
          )
        })}
      </div>

      {/*
        실제 키보드 입력을 받는 textarea예요.
        예전엔 크기를 1px×1px로 거의 없애버렸는데, 크기가 거의 0인 입력창에서는
        일부 Windows IME가 한글 조합을 이상하게 처리하는 경우가 있어서
        크기는 정상적으로 주고, 글자만 투명하게(색 없이) 만들어서 안 보이게 바꿨어요.
        VS Code 같은 에디터들도 IME 지원할 때 이 방식을 씁니다.
      */}
      <textarea
        ref={inputRef}
        className="typing-hidden-input"
        defaultValue=""
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        maxLength={PRACTICE_TEXT.length}
        disabled={isFinished}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        autoFocus
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
          outline: "none",
          resize: "none",
          background: "transparent",
          color: "transparent",
          caretColor: "transparent",
          fontSize: "28px", // 실제 글자 크기와 맞춰줘야 IME 후보창 위치도 자연스러워요
          lineHeight: "1.9",
          // 마우스로 이 textarea를 직접 건드릴 수 없게 막아요 (드래그로 선택 자체가 안 되게).
          // 포커스는 위쪽 div의 onClick이 .focus()를 직접 호출해서 주니까 문제없어요.
          pointerEvents: "none",
        }}
      />

      <p style={{ marginTop: "16px", color: "var(--text)" }}>
        {isFinished ? "다 쳤어요! 🎉" : `${inputText.length} / ${PRACTICE_TEXT.length}`}
      </p>
    </div>
  )
}

export default TypingSolo

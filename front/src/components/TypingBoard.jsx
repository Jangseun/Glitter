import "./TypingBoard.css"

// 연습 문장을 그리고, 그 위에 투명한 textarea를 겹쳐서 "문장 위에서 바로 치는" 느낌을 만드는 컴포넌트.
// 상태와 입력 처리는 전부 useTypingSession hook이 들고 있고, 이 컴포넌트는 그걸 받아서 그리기만 해요.
//
// session: useTypingSession()이 돌려준 객체
const TypingBoard = ({ session }) => {
  const {
    text,
    disabled,
    inputRef,
    inputText,
    liveComposingText,
    isComposing,
    confirmedLength,
    isFocused,
    isFinished,
    round,
    focus,
    inputHandlers,
  } = session

  // 포커스를 잃었을 때만 흐리게 + 안내. (완료됐거나 아직 입력이 막혀있을 땐 안내할 필요 없음)
  const showBlur = !isFocused && !isFinished && !disabled

  return (
    <div className={`tb${showBlur ? " blurred" : ""}`} onClick={focus}>
      <div className="tb-text">
        {text.split("").map((char, index) => {
          // 지금 조합 중인 글자가 들어갈 자리인지 (confirmedLength번째 자리)
          const isComposingHere = isComposing && index === confirmedLength

          // 커서는 항상 "확정된 글자 바로 뒤" = confirmedLength 위치에 그려요.
          // 포커스를 잃었거나 입력이 막혀있을 땐 칠 수 없으니 커서도 숨겨요.
          const isCursorHere = isFocused && !disabled && index === confirmedLength

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
        - key={round}: reset할 때마다 textarea를 새로 만들어서 브라우저 내부의
          실행 취소 기록 같은 찌꺼기가 남지 않게 해요.
      */}
      <textarea
        key={round}
        ref={inputRef}
        className="tb-input"
        defaultValue=""
        {...inputHandlers}
        maxLength={text.length}
        disabled={isFinished || disabled}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
      />

      {showBlur && <div className="tb-overlay">클릭하면 이어서 칠 수 있어요</div>}
    </div>
  )
}

export default TypingBoard

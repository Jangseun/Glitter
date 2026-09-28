import { useState } from "react"
import { STORY_PROMPT_CATEGORIES, drawPrompt, redrawOne } from "../data/storyPrompts"
import "./PromptPicker.css"

// 랜덤 소재 뽑기 UI.
// 1) 받고 싶은 항목만 켜고 (예: 장르 + 필수 단어만)
// 2) "뽑기"를 누르면 켜진 항목만 무작위로 뽑히고
// 3) 마음에 안 드는 항목은 옆의 ↻ 버튼으로 그것만 다시 뽑을 수 있어요.
//
// 뽑힌 결과(value)는 부모(WritingSolo)가 들고 있어요. 글쓰기 화면으로 넘어갈 때
// 그 값을 그대로 가져가야 하기 때문이에요. 이 컴포넌트는 "어떤 항목을 켰는지"만 직접 관리해요.
const PromptPicker = ({ value, onChange }) => {
  // 뽑기 대상으로 켜둔 항목 key 목록. 처음엔 전부 켜둬요.
  const [enabledKeys, setEnabledKeys] = useState(() => STORY_PROMPT_CATEGORIES.map((c) => c.key))

  const toggleKey = (key) => {
    if (enabledKeys.includes(key)) {
      setEnabledKeys(enabledKeys.filter((k) => k !== key))
      // 항목을 끄면 이미 뽑혀있던 그 항목 값도 결과에서 빼줘요.
      if (value?.[key]) {
        const next = { ...value }
        delete next[key]
        onChange(next)
      }
    } else {
      setEnabledKeys([...enabledKeys, key])
    }
  }

  const handleDraw = () => onChange(drawPrompt(enabledKeys))

  const handleRedraw = (key) => onChange({ ...value, [key]: redrawOne(key, value[key]) })

  const hasResult = value && Object.keys(value).length > 0

  return (
    <div className="picker">
      <p className="picker-label">받고 싶은 소재를 고르세요</p>
      <div className="picker-toggles">
        {STORY_PROMPT_CATEGORIES.map((category) => {
          const on = enabledKeys.includes(category.key)
          return (
            <button
              key={category.key}
              type="button"
              className={`chip${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => toggleKey(category.key)}
            >
              {category.label}
            </button>
          )
        })}
      </div>

      <button type="button" className="btn primary picker-draw" onClick={handleDraw} disabled={enabledKeys.length === 0}>
        {hasResult ? "전부 다시 뽑기" : "소재 뽑기"}
      </button>

      {hasResult && (
        <ul className="picker-result">
          {STORY_PROMPT_CATEGORIES.filter((c) => value[c.key]).map((category) => (
            <li key={category.key}>
              <span className="picker-key">{category.label}</span>
              {/* key를 값으로 줘서 값이 바뀔 때마다 새로 그려지게 → CSS 등장 애니메이션이 다시 재생돼요 */}
              <span key={value[category.key]} className="picker-value">
                {value[category.key]}
              </span>
              <button
                type="button"
                className="picker-redraw"
                onClick={() => handleRedraw(category.key)}
                aria-label={`${category.label} 다시 뽑기`}
                title="이것만 다시 뽑기"
              >
                ↻
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PromptPicker

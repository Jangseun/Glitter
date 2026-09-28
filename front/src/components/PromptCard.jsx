import { STORY_PROMPT_CATEGORIES } from "../data/storyPrompts"
import "./PromptCard.css"

// 이야기 소재를 "라벨: 값" 형태로 보여주는 읽기 전용 카드.
// 글쓰기 화면(쓰는 중 참고용)과 작품 상세 화면(어떤 소재로 썼는지)에서 같이 써요.
//
// body를 넘기면 "필수 단어"를 본문에 썼는지 체크 표시도 해줘요.
const PromptCard = ({ prompt, body }) => {
  // 카테고리 순서(장르 → 장소 → ...)를 지키기 위해 prompt 객체가 아니라
  // STORY_PROMPT_CATEGORIES를 기준으로 돌면서, 뽑힌 항목만 보여줘요.
  const rows = STORY_PROMPT_CATEGORIES.filter((c) => prompt?.[c.key])

  if (rows.length === 0) return null

  return (
    <dl className="pcard">
      {rows.map((category) => {
        const value = prompt[category.key]
        // 필수 단어를 본문에 넣었는지 확인 (body가 주어졌을 때만)
        const showCheck = category.key === "word" && typeof body === "string"
        const used = showCheck && body.includes(value)

        return (
          <div key={category.key} className="pcard-row">
            <dt>{category.label}</dt>
            <dd>
              {value}
              {showCheck && <span className={`pcard-check${used ? " done" : ""}`}>{used ? "✓ 사용함" : "아직 안 씀"}</span>}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export default PromptCard

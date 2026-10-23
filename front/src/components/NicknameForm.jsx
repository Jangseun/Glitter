import { useState } from "react"
import { NICKNAME_MAX } from "../utils/nickname"
import "./NicknameForm.css"

// 닉네임 입력칸 + 버튼. 친구와 하는 기능(대결, 이어쓰기)에 들어가기 전에 써요.
// submitLabel: 버튼 글자 (예: "입장하기")
// onSubmit:    앞뒤 공백을 지운 닉네임을 넘겨줘요
const NicknameForm = ({ initialValue = "", submitLabel = "확인", onSubmit }) => {
  const [value, setValue] = useState(initialValue)
  const trimmed = value.trim()

  // form의 submit 이벤트를 쓰면 Enter 키로도 제출돼요.
  // preventDefault: 브라우저 기본 동작(페이지 새로고침하며 전송)을 막아요.
  const handleSubmit = (e) => {
    e.preventDefault()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <form className="nick" onSubmit={handleSubmit}>
      <input
        className="nick-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={NICKNAME_MAX}
        placeholder="닉네임"
        autoFocus
      />
      <button type="submit" className="btn primary" disabled={!trimmed}>
        {submitLabel}
      </button>
    </form>
  )
}

export default NicknameForm

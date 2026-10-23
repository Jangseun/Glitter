import { Link } from "react-router-dom"
import "./BackButton.css"

// 동그란 화살표 "뒤로" 버튼.
// 글자 없이 화살표만 보이고, 마우스를 올리면 label이 말풍선(title)으로 보여요.
// 화면 낭독기(시각장애인용)도 aria-label로 label을 읽어줘요.
//
// to:      이동할 주소 (Link로 동작)
// onClick: 주소 이동 대신 실행할 함수 (예: 같은 페이지 안에서 목록 화면으로 돌아가기)
// label:   설명 (예: "글 목록으로")
const BackButton = ({ to, onClick, label }) => {
  const icon = (
    // 왼쪽 화살표 아이콘. stroke="currentColor"라서 버튼 글자색(테마)을 그대로 따라가요.
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  if (onClick) {
    return (
      <button type="button" className="back-btn" onClick={onClick} aria-label={label} title={label}>
        {icon}
      </button>
    )
  }
  return (
    <Link to={to} className="back-btn" aria-label={label} title={label}>
      {icon}
    </Link>
  )
}

export default BackButton

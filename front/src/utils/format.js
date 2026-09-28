// ISO 날짜 문자열 → "2026. 9. 28." 같은 한국식 표기
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })

// 작성 방식 코드 → 화면 표시용 이름
export const MODE_LABELS = {
  solo: "혼자 쓰기",
  relay: "함께 이어쓰기",
}

// 닉네임 저장/불러오기.
// 아직 로그인 기능이 없어서, 친구와 하는 기능에서는 닉네임만으로 참가자를 구분해요.
// 한 번 입력하면 브라우저에 저장해서 다음에 또 묻지 않게 해요.

const KEY = "glitter:nickname"
export const NICKNAME_MAX = 12 // 백엔드(routers/rooms.py)의 max_length와 맞춰야 해요

export const getNickname = () => {
  try {
    return localStorage.getItem(KEY) ?? ""
  } catch {
    return "" // 사생활 보호 모드 등으로 저장소 접근이 막힌 경우
  }
}

export const saveNickname = (nickname) => {
  try {
    localStorage.setItem(KEY, nickname)
  } catch {
    // 저장을 못 해도 이번 접속에서는 쓸 수 있으니 무시
  }
}

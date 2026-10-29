import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { getNickname, saveNickname } from "../utils/nickname"

// 친구 방(대결/이어쓰기)에서 쓸 닉네임을 정하는 hook.
//
// 우선순위: 1) 이 브라우저에서 전에 쓴 닉네임  2) 로그인한 회원의 닉네임  3) 없음(직접 입력)
// → 로그인했으면 초대 링크로 들어와도 닉네임을 다시 묻지 않아요.
//
// checking: 로그인 정보를 아직 확인하는 중이면 true.
//   이때 바로 "닉네임 없음"으로 판단하면, 로그인한 사람에게도 입력창이 잠깐 보였다가 사라져요.
//   그래서 확인이 끝날 때까지는 nickname을 빈 값으로 두고(접속하지 않고) 기다려요.
export const useRoomNickname = () => {
  const { user, checking } = useAuth()
  const [saved, setSaved] = useState(getNickname)

  const nickname = checking ? "" : saved || user?.nickname || ""

  // 닉네임 입력 화면에서 정했을 때: 다음에도 쓰도록 저장
  const choose = (value) => {
    saveNickname(value)
    setSaved(value)
  }

  return { nickname, checking, choose }
}

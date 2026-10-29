import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { createRoom } from "../services/roomsApi"
import { NICKNAME_MAX, getNickname, saveNickname } from "../utils/nickname"
import "./RoomLobby.css"

// 친구와 하는 기능의 시작 화면 (타자 대결 / 공동 이어쓰기 공통)
// 닉네임을 정하고, 방을 새로 만들거나 친구에게 받은 방 코드로 들어가요.
//
// title:    화면 제목 (예: "친구와 타자 대결")
// kind:     만들 방 종류 → 서버의 ROOM_CLASSES 키 ("typing" | "relay")
// roomPath: 방 화면 주소 앞부분 (예: "/typing/battle" → /typing/battle/AB3CD 로 이동)
// createDesc: "방 만들기" 카드 설명 문구
const RoomLobby = ({ title, kind, roomPath, createDesc }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  // 닉네임 입력칸 값. 비어 있으면(아직 안 건드림) 전에 쓴 닉네임 → 로그인 닉네임을 보여줘요.
  // 로그인 정보는 페이지가 뜬 "뒤"에 도착할 수 있어서, 처음 값으로 고정하지 않고 매번 계산해요.
  // (typed가 null = 사용자가 아직 입력칸을 건드리지 않음)
  const [typed, setTyped] = useState(null)
  const nickname = typed ?? (getNickname() || user?.nickname || "")
  const setNickname = setTyped
  const [code, setCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const trimmedNickname = nickname.trim()

  const handleCreate = async () => {
    setIsCreating(true)
    setError("")
    try {
      const { roomId } = await createRoom(kind)
      saveNickname(trimmedNickname)
      navigate(`${roomPath}/${roomId}`)
    } catch (err) {
      console.error(err)
      setError("방을 만들지 못했어요. 서버가 켜져 있는지 확인해주세요.")
      setIsCreating(false)
    }
  }

  const handleJoin = (e) => {
    e.preventDefault() // form 제출 시 새로고침 방지 (Enter로도 입장 가능)
    const roomId = code.trim().toUpperCase()
    if (!roomId) return
    saveNickname(trimmedNickname)
    navigate(`${roomPath}/${roomId}`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
      </header>

      <section className="lobby-nick">
        <label className="lobby-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="field"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX}
          placeholder="친구들에게 보일 이름"
        />
      </section>

      <div className="lobby-options">
        <section className="lobby-card">
          <h2>방 만들기</h2>
          <p>{createDesc}</p>
          <button type="button" className="btn primary" onClick={handleCreate} disabled={!trimmedNickname || isCreating}>
            {isCreating ? "만드는 중…" : "방 만들기"}
          </button>
        </section>

        <form className="lobby-card" onSubmit={handleJoin}>
          <h2>방 코드로 입장</h2>
          <p>친구에게 받은 5자리 코드를 입력해요.</p>
          <div className="lobby-join">
            <input
              className="field lobby-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="AB3CD"
            />
            <button type="submit" className="btn" disabled={!trimmedNickname || !code.trim()}>
              입장
            </button>
          </div>
        </form>
      </div>

      {!trimmedNickname && <p className="lobby-hint">먼저 닉네임을 정해주세요.</p>}
      {error && <p className="lobby-error">{error}</p>}
    </div>
  )
}

export default RoomLobby

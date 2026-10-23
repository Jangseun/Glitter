import { useState } from "react"
import { Link } from "react-router-dom"
import NicknameForm from "./NicknameForm"
import BackButton from "./BackButton"
import "./RoomFrame.css"

// 실시간 방 화면(타자 대결 / 공동 이어쓰기)이 같이 쓰는 틀 모음.
//   RoomShell  : 헤더(나가기 + 제목)가 있는 페이지 틀
//   RoomGate   : 방에 들어가기 "전" 화면들 (닉네임 입력 / 접속 중 / 입장 실패 / 연결 끊김)
//   RoomInvite : 대기실의 방 코드 + 초대 링크 복사

// 페이지 틀
export const RoomShell = ({ backTo, title, children }) => (
  <div className="page">
    <header className="page-header">
      {/* 이 페이지를 떠나면 useRoomSocket의 cleanup이 연결을 닫아서 자동으로 퇴장돼요 */}
      <BackButton to={backTo} label="방 나가기" />
      <h1 className="page-title">{title}</h1>
    </header>
    {children}
  </div>
)

// 방에 들어갈 준비가 다 됐을 때만 children을 그려요. 아니면 상황에 맞는 안내 화면을 보여줘요.
//
// children을 "함수"로 받는 이유:
//   <RoomGate>{() => <p>{socket.room.id}</p>}</RoomGate>
// 처럼 쓰면, 함수 안의 코드는 RoomGate가 "준비됐다"고 판단해서 호출할 때만 실행돼요.
// 그냥 JSX로 넘기면 room이 아직 null일 때도 socket.room.id를 읽다가 에러가 나요.
export const RoomGate = ({ roomId, nickname, onNickname, socket, backTo, title, children }) => {
  const { connection, room, playerId, fatalError } = socket

  let screen = null
  if (!nickname) {
    // 초대 링크로 처음 들어온 친구는 닉네임부터 정해요.
    screen = (
      <div className="empty">
        <p>
          <b>{roomId}</b> 방에 들어갈 닉네임을 정해주세요.
        </p>
        <NicknameForm submitLabel="입장하기" onSubmit={onNickname} />
      </div>
    )
  } else if (fatalError) {
    screen = (
      <div className="empty">
        <p>{fatalError}</p>
        <Link to={backTo} className="btn">
          시작 화면으로
        </Link>
      </div>
    )
  } else if (connection === "closed") {
    screen = (
      <div className="empty">
        <p>서버와 연결이 끊어졌어요.</p>
        {/* 다시 접속하면 새 참가자로 들어가요. (진행 중이던 게임에는 다시 못 들어감) */}
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          다시 연결
        </button>
      </div>
    )
  } else if (!room || !playerId) {
    screen = <p className="empty">방에 들어가는 중…</p>
  }

  if (screen) {
    return (
      <RoomShell backTo={backTo} title={title}>
        {screen}
      </RoomShell>
    )
  }
  return children()
}

// 방 코드 + 초대 링크 복사
export const RoomInvite = ({ roomId }) => {
  const [copied, setCopied] = useState(false)
  const inviteUrl = window.location.href

  const copyInvite = async () => {
    try {
      // 클립보드 API는 https나 localhost에서만 동작해요.
      // 다른 PC에서 192.168.x.x 같은 주소로 접속한 경우엔 실패할 수 있어서, 아래에 링크 글자도 보여줘요.
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="invite">
      <div>
        <span className="invite-label">방 코드</span>
        <strong className="invite-code">{roomId}</strong>
      </div>
      <div className="invite-link">
        <button type="button" className="btn" onClick={copyInvite}>
          {copied ? "복사됐어요!" : "초대 링크 복사"}
        </button>
        <span>{inviteUrl}</span>
      </div>
    </section>
  )
}

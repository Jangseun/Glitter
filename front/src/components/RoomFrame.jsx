import { useRef, useState } from "react"
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
// checkingAuth: 로그인 정보 확인 중이면 true → 닉네임 입력창 대신 "확인 중"을 보여줘요 (깜빡임 방지)
export const RoomGate = ({ roomId, nickname, checkingAuth, onNickname, socket, backTo, title, children }) => {
  const { connection, room, playerId, fatalError } = socket

  let screen = null
  if (checkingAuth) {
    screen = <p className="empty">확인 중…</p>
  } else if (!nickname) {
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
  // "idle" = 평소, "done" = 복사됨, "fail" = 복사 실패 (직접 복사하라고 안내)
  const [copyState, setCopyState] = useState("idle")
  const linkRef = useRef(null)
  const inviteUrl = window.location.href

  const copyInvite = async () => {
    const ok = (await copyWithClipboardApi(inviteUrl)) || copyWithExecCommand(inviteUrl)
    if (!ok) selectText(linkRef.current) // 실패하면 링크 글자를 선택해둬서 Ctrl+C / 길게 눌러 복사만 하면 되게
    setCopyState(ok ? "done" : "fail")
    setTimeout(() => setCopyState("idle"), ok ? 2000 : 4000)
  }

  return (
    <section className="invite">
      <div>
        <span className="invite-label">방 코드</span>
        <strong className="invite-code">{roomId}</strong>
      </div>
      <div className="invite-link">
        <button type="button" className="btn" onClick={copyInvite}>
          {copyState === "done" ? "복사됐어요!" : copyState === "fail" ? "직접 복사해주세요" : "초대 링크 복사"}
        </button>
        <span ref={linkRef}>{inviteUrl}</span>
      </div>
    </section>
  )
}

// ---- 복사 도우미 ----
// 1순위: 최신 클립보드 API. 단, https(또는 localhost)에서만 있고,
//        카카오톡/인스타 같은 앱 안 브라우저나 일부 휴대폰 브라우저에선 막혀 있을 때가 많아요.
const copyWithClipboardApi = async (text) => {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// 2순위: 옛날 방식. 안 보이는 textarea에 글을 넣고 선택한 뒤 "복사" 명령을 실행해요.
// execCommand는 표준에서 "더 이상 권장 안 함"이지만, 1순위가 막힌 브라우저에서도 대부분 동작해서 대체용으로 써요.
const copyWithExecCommand = (text) => {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "") // 휴대폰에서 키보드가 튀어나오지 않게
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  textarea.remove()
  return ok
}

// 요소 안의 글자를 드래그한 것처럼 선택해요.
const selectText = (el) => {
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

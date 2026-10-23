import { useCallback, useEffect, useRef, useState } from "react"
import { wsUrl } from "../services/http"

// 서버가 "입장 거절"로 연결을 끊을 때 쓰는 종료 코드 (backend/app/routers/rooms.py와 같은 값)
const REJECT_CODES = [4404, 4409]

// 실시간 방에 WebSocket으로 접속하는 커스텀 hook.
// 타자 대결, 공동 이어쓰기 등 "방" 기능에서 공통으로 써요.
//
// 사용법:
//   const { connection, room, playerId, notice, fatalError, send } = useRoomSocket(roomId, nickname)
//
// connection: "connecting" | "open" | "closed"  - 연결 상태
// room:       서버가 보내준 방 상태 전체 (참가자 목록, 진행 상태 등). 처음엔 null
// playerId:   서버가 붙여준 "내" 참가자 id. room.players 중에서 나를 찾을 때 써요.
// notice:     일시적인 안내/에러 메시지 (예: "모두 준비해야 시작할 수 있어요.")
// fatalError: 방에 아예 못 들어간 이유 (방이 없음, 가득 참 등). 있으면 방 화면 대신 에러 화면을 보여줘요.
// send:       서버로 메시지 보내기. send({ type: "ready", ready: true })
//
// nickname이 비어있으면 접속하지 않아요. (닉네임 입력 화면을 먼저 보여주기 위해)
export const useRoomSocket = (roomId, nickname) => {
  const [connection, setConnection] = useState("connecting")
  const [room, setRoom] = useState(null)
  const [playerId, setPlayerId] = useState(null)
  const [notice, setNotice] = useState("")
  const [fatalError, setFatalError] = useState("")

  // 지금 열려 있는 WebSocket 객체.
  // state가 아니라 ref인 이유: 소켓 객체가 바뀐다고 화면을 다시 그릴 필요는 없고,
  // send() 함수에서 "지금 소켓"을 꺼내 쓰기만 하면 되기 때문이에요.
  const socketRef = useRef(null)

  useEffect(() => {
    if (!roomId || !nickname) return

    const query = `nickname=${encodeURIComponent(nickname)}`
    const ws = new WebSocket(wsUrl(`/api/ws/rooms/${encodeURIComponent(roomId)}?${query}`))
    socketRef.current = ws

    // 서버가 보낸 마지막 에러 메시지. 바로 뒤에 연결이 끊기면(입장 거절) 그 이유로 보여줘요.
    let lastError = ""

    ws.onopen = () => setConnection("open")

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === "welcome") {
        setPlayerId(message.playerId)
      } else if (message.type === "room") {
        setRoom(message.room)
      } else if (message.type === "error") {
        lastError = message.message
        setNotice(message.message)
      }
    }

    ws.onclose = (event) => {
      setConnection("closed")
      if (REJECT_CODES.includes(event.code)) {
        setFatalError(lastError || "방에 들어갈 수 없어요.")
      }
    }

    // cleanup: 페이지를 떠나거나 roomId/nickname이 바뀌면 연결을 닫아요.
    // 핸들러를 먼저 지우는 이유: 일부러 닫는 거라 "연결이 끊겼어요" 처리를 하면 안 되고,
    // 화면이 사라진 뒤에 setState가 호출되지 않게 하기 위해서예요.
    //
    // 참고) 개발 모드의 React StrictMode는 effect를 일부러 "실행 → cleanup → 다시 실행"해요.
    // 그래서 개발 중엔 서버에 접속했다가 바로 나가는 기록이 한 번 더 생기는데, 정상이에요.
    return () => {
      ws.onopen = null
      ws.onmessage = null
      ws.onclose = null
      ws.close()
      socketRef.current = null
    }
  }, [roomId, nickname])

  // useCallback: 이 함수를 렌더링마다 새로 만들지 않고 같은 함수를 재사용해요.
  // 다른 컴포넌트의 useEffect 의존성에 send를 넣었을 때, 매번 effect가 다시 실행되는 걸 막아줘요.
  const send = useCallback((message) => {
    const ws = socketRef.current
    // 연결이 아직 안 됐거나 끊긴 상태에서 send하면 에러가 나서, 열려 있을 때만 보내요.
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
      setNotice("") // 새 동작을 하면 이전 안내 메시지는 지워요
    }
  }, [])

  return { connection, room, playerId, notice, fatalError, send }
}

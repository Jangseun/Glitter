// 실시간 방 관련 HTTP API. (실제 실시간 통신은 hooks/useRoomSocket.js의 WebSocket이 담당)
import { request } from "./http"

// 방 만들기 → { roomId: "AB3CD", kind: "typing" }
export const createRoom = (kind) => request("/api/rooms", { method: "POST", body: { kind } })

"""실시간 방 API.

POST /api/rooms                 방 만들기 → { "roomId": "AB3CD", "kind": "typing" }
GET  /api/rooms/{room_id}       방 정보 확인 (입장 전에 방이 있는지 확인용)
WS   /api/ws/rooms/{room_id}?nickname=민지   방에 입장 (WebSocket)

[WebSocket이란?]
HTTP는 "클라이언트가 요청 → 서버가 응답" 한 번으로 끝나서, 서버가 먼저 말을 걸 수 없어요.
WebSocket은 연결을 계속 열어두고 양쪽이 아무 때나 메시지를 보낼 수 있어요.
그래서 "친구가 지금 몇 % 쳤는지"를 서버가 바로바로 밀어줄 수 있어요.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel

from app.services.rooms import room_manager

router = APIRouter(tags=["rooms"])


class RoomCreate(BaseModel):
    kind: Literal["typing", "relay"] = "typing"  # typing = 타자 대결, relay = 공동 이어쓰기


@router.post("/api/rooms", status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate):
    room = room_manager.create(data.kind)
    return {"roomId": room.id, "kind": room.kind}


@router.get("/api/rooms/{room_id}")
def read_room(room_id: str):
    room = room_manager.get(room_id)
    if room is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="방을 찾을 수 없어요.")
    return {
        "roomId": room.id,
        "kind": room.kind,
        "status": room.status,
        "playerCount": len(room.players),
        "joinError": room.join_error(),  # 들어갈 수 없으면 이유, 들어갈 수 있으면 null
    }


# 입장 거절 시 WebSocket 종료 코드. 4000~4999는 앱이 자유롭게 쓸 수 있는 번호예요.
# 프론트에서 이 코드를 보고 "다시 연결 시도하지 말 것"을 판단해요.
CLOSE_ROOM_NOT_FOUND = 4404
CLOSE_JOIN_REJECTED = 4409


@router.websocket("/api/ws/rooms/{room_id}")
async def room_socket(
    websocket: WebSocket,
    room_id: str,
    nickname: str = Query(min_length=1, max_length=12),
):
    """방 하나에 대한 WebSocket 연결. 연결이 유지되는 동안 이 함수가 계속 실행돼요.

    흐름:
      1) 연결 수락 → 방/입장 가능 여부 확인 (안 되면 에러 보내고 종료)
      2) 참가자로 등록 → 내 id(welcome)와 방 상태를 보내줌
      3) 메시지를 기다렸다가 받을 때마다 방에 처리 맡기기 (무한 반복)
      4) 연결이 끊기면(탭 닫기, 새로고침 등) 퇴장 처리 → 남은 사람들에게 알림
    """
    # 먼저 accept를 해야 에러 메시지라도 보낼 수 있어요. (accept 전에는 아무것도 못 보냄)
    await websocket.accept()

    room = room_manager.get(room_id)
    if room is None:
        await websocket.send_json({"type": "error", "message": "방을 찾을 수 없어요."})
        await websocket.close(code=CLOSE_ROOM_NOT_FOUND)
        return

    error = room.join_error()
    if error:
        await websocket.send_json({"type": "error", "message": error})
        await websocket.close(code=CLOSE_JOIN_REJECTED)
        return

    player = room.add_player(nickname.strip() or "익명", websocket)
    await websocket.send_json({"type": "welcome", "playerId": player.id})
    await room.broadcast_state()

    try:
        while True:
            # 클라이언트가 메시지를 보낼 때까지 여기서 기다려요. (await 동안 다른 사람 처리는 계속 진행됨)
            try:
                message = await websocket.receive_json()
            except ValueError:
                # JSON이 아닌 이상한 메시지는 무시하고 다음 메시지를 기다려요.
                continue
            if isinstance(message, dict):
                await room.handle(player, message)
    except WebSocketDisconnect:
        # 연결이 끊기면 receive_json에서 이 예외가 발생해요. 정상적인 퇴장이라 따로 할 일 없음
        pass
    finally:
        # 예외가 무엇이든 반드시 퇴장 처리. 안 하면 "유령 참가자"가 방에 남아요.
        room.remove_player(player.id)
        if room.is_empty:
            room_manager.remove(room.id)
        else:
            await room.broadcast_state()


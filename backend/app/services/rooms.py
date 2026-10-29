"""실시간 방(Room) 관리.

[구조]
    RoomManager : 방 목록을 들고 있는 관리자 (서버 전체에 하나: room_manager)
    Room        : 방 하나의 공통 기능 - 참가자 입장/퇴장, 방장 관리, 모두에게 메시지 보내기
    TypingRoom  : Room을 상속해서 "타자 대결" 규칙을 추가한 방
    RelayRoom   : Room을 상속해서 "공동 이어쓰기" 규칙을 추가한 방

[왜 DB가 아니라 메모리(파이썬 dict)에 저장하나요?]
방은 게임하는 동안만 잠깐 존재하고, 끝나면 사라져도 되는 데이터라서예요.
대신 서버를 재시작하면 모든 방이 사라져요. (졸업작품 규모에선 문제없음)
또 uvicorn을 여러 프로세스(--workers 2 이상)로 띄우면 프로세스끼리 방 목록을 공유하지 못하니
반드시 1개 프로세스로 실행해야 해요. (개발 중 기본 설정이 1개라 신경 쓸 필요는 없어요)

[동시성 관련]
FastAPI의 WebSocket 처리는 하나의 이벤트 루프(스레드 1개)에서 돌아가요.
await 사이사이에서만 다른 작업으로 전환되기 때문에, await 없이 dict를 수정하는 코드는
중간에 끼어들 일이 없어서 따로 잠금(lock)을 걸지 않아도 돼요.
"""

import asyncio
import secrets
import time
from dataclasses import dataclass, field

from fastapi import WebSocket

# 방 코드에 쓸 글자. 헷갈리는 글자(0/O, 1/I/L)는 뺐어요. 친구에게 말로 불러줄 수도 있으니까.
ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
ROOM_CODE_LENGTH = 5

MAX_PLAYERS = 6
COUNTDOWN_SECONDS = 3

# ---- 공동 이어쓰기 설정 범위 ----
RELAY_LAPS_MIN, RELAY_LAPS_MAX = 1, 5
# laps = 0 은 "바퀴 수 없음" 모드: 정해진 차례 없이 돌다가, 누군가 "완결" 버튼을 눌러야 끝나요.
RELAY_LAPS_UNLIMITED = 0
# 바퀴 수 없음 모드라도 이야기가 끝없이 길어지면 서버 메모리를 계속 차지하니까, 이만큼 돌면 자동으로 완결해요.
RELAY_UNLIMITED_MAX_TURNS = 100
RELAY_TURN_SECONDS = (0, 60, 90, 120, 180)  # 0 = 제한 없음
RELAY_MAX_TEXT = 1000  # 한 차례에 쓸 수 있는 최대 글자 수
TURN_GRACE_SECONDS = 5  # 시간 초과 후 서버가 강제로 차례를 넘기기까지 더 기다려주는 시간

# 아무도 없는 채로 이 시간(초)이 지난 방은 정리해요.
# 사람이 다 나가자마자 지우면, 혼자 있던 방장이 새로고침만 해도 방이 사라져서 초대 링크가 죽어버려요.
# 그래서 빈 방도 잠시 남겨두고, 오래 비어 있을 때만 지워요.
EMPTY_ROOM_TTL_SECONDS = 10 * 60


@dataclass
class Player:
    """방에 들어온 참가자 한 명.

    @dataclass: __init__ 등을 자동으로 만들어주는 데코레이터.
    Player(id="a1", nickname="민지", websocket=ws) 처럼 바로 만들 수 있어요.
    """

    id: str
    nickname: str
    websocket: WebSocket

    # ---- 타자 대결용 상태 ----
    ready: bool = False
    progress: float = 0.0  # 0 ~ 1 (문장을 얼마나 쳤는지)
    speed: int = 0  # 타/분
    accuracy: float = 100.0  # %
    finished: bool = False
    rank: int | None = None  # 몇 등으로 끝냈는지 (1부터)
    result: dict | None = None  # 완료 시 최종 기록 { speed, accuracy, typoCount, seconds }

    def reset_game_state(self) -> None:
        """한 판이 끝나고 다시 할 때 게임 기록만 초기화 (닉네임/연결은 그대로)"""
        self.ready = False
        self.progress = 0.0
        self.speed = 0
        self.accuracy = 100.0
        self.finished = False
        self.rank = None
        self.result = None


class Room:
    """모든 종류의 방이 공통으로 쓰는 기능."""

    kind = "base"  # 하위 클래스에서 "typing", "relay" 등으로 덮어써요

    def __init__(self, room_id: str):
        self.id = room_id
        # 참가자 목록. dict는 넣은 순서를 기억해서 "들어온 순서"대로 보여줄 수 있어요.
        self.players: dict[str, Player] = {}
        self.host_id: str | None = None
        self.status = "waiting"
        # 방이 비게 된 시각. 사람이 있으면 None. (만들어진 직후엔 아무도 없으니 지금 시각)
        self.empty_since: float | None = time.time()

    # ---------- 입장/퇴장 ----------

    def join_error(self) -> str | None:
        """들어올 수 없는 상황이면 이유를, 들어올 수 있으면 None을 돌려줘요."""
        if len(self.players) >= MAX_PLAYERS:
            return f"방이 가득 찼어요. (최대 {MAX_PLAYERS}명)"
        if self.status != "waiting":
            return "이미 게임이 진행 중이에요. 끝난 뒤에 다시 들어와주세요."
        return None

    def add_player(self, nickname: str, websocket: WebSocket) -> Player:
        player = Player(id=secrets.token_hex(4), nickname=nickname, websocket=websocket)
        self.players[player.id] = player
        # 첫 번째로 들어온 사람이 방장
        if self.host_id is None:
            self.host_id = player.id
        self.empty_since = None
        return player

    def remove_player(self, player_id: str) -> None:
        self.players.pop(player_id, None)
        # 방장이 나가면 남은 사람 중 가장 먼저 들어온 사람에게 방장을 넘겨요.
        if self.host_id == player_id:
            self.host_id = next(iter(self.players), None)
        self.on_player_left(player_id)

        if self.is_empty:
            # 모두 나갔으면: 돌던 타이머를 멈추고 게임을 "대기 중"으로 되돌려요.
            # (게임 중에 다 나갔는데 그대로 두면, 다시 들어오려 할 때 "게임 진행 중"이라 못 들어와요)
            self.empty_since = time.time()
            self.close()
            self.reset_game()

    def reset_game(self) -> None:
        """게임 진행 상태를 처음(대기 중)으로. 하위 클래스에서 게임별 상태도 같이 초기화해요."""
        self.status = "waiting"

    def on_player_left(self, player_id: str) -> None:
        """누군가 나갔을 때 게임별로 할 일 (하위 클래스에서 필요하면 덮어씀)"""

    def close(self) -> None:
        """방이 사라질 때 정리할 것 (예: 돌고 있는 타이머 취소). 하위 클래스에서 필요하면 덮어씀"""

    @property
    def is_empty(self) -> bool:
        return len(self.players) == 0

    # ---------- 메시지 보내기 ----------

    async def send(self, player: Player, message: dict) -> None:
        """한 명에게 보내기. 이미 연결이 끊긴 사람이면 조용히 무시해요.
        (끊긴 사람은 그 사람의 WebSocket 처리 루프에서 알아서 퇴장 처리돼요)"""
        try:
            await player.websocket.send_json(message)
        except Exception:
            pass

    async def broadcast(self, message: dict) -> None:
        """방 안의 모든 사람에게 같은 메시지를 보내요.
        list(...)로 복사해서 도는 이유: 보내는 도중(await) 누가 나가서 dict가 바뀌면
        "dictionary changed size during iteration" 에러가 나기 때문이에요."""
        for player in list(self.players.values()):
            await self.send(player, message)

    async def broadcast_state(self) -> None:
        """방의 현재 상태 전체를 모두에게 보내요.
        변화가 있을 때마다 "바뀐 부분"만 보내는 대신 "전체 상태"를 보내는 방식이에요.
        참가자가 몇 명뿐이라 데이터가 작고, 프론트는 받은 걸 그대로 화면에 그리기만 하면 돼서
        상태가 어긋날 일이 없어요."""
        await self.broadcast({"type": "room", "room": self.to_dict()})

    def to_dict(self) -> dict:
        """프론트로 보낼 방 상태 (WebSocket 객체처럼 JSON으로 못 바꾸는 건 빼고)"""
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "hostId": self.host_id,
            "maxPlayers": MAX_PLAYERS,
            "players": [self.player_to_dict(p) for p in self.players.values()],
        }

    def player_to_dict(self, player: Player) -> dict:
        return {"id": player.id, "nickname": player.nickname, "isHost": player.id == self.host_id}

    # ---------- 메시지 받기 ----------

    async def handle(self, player: Player, message: dict) -> None:
        """클라이언트가 보낸 메시지 처리 (하위 클래스에서 구현)"""


class TypingRoom(Room):
    """친구와 타자 대결 방.

    [상태 흐름]
    waiting ──(방장이 start)──▶ countdown ──(3초 후 서버가 자동으로)──▶ playing
       ▲                                                                  │
       └──────────(방장이 reset: 한 판 더)──── finished ◀──(모두 완료)─────┘

    [클라이언트 → 서버 메시지]
    { "type": "ready", "ready": true }                  준비 / 준비 취소 (방장 제외)
    { "type": "start", "sentence": {id, text, source} } 게임 시작 (방장만, 문장은 방장 화면에서 골라 보냄)
    { "type": "progress", "progress": 0.4, "speed": 320, "accuracy": 97.5 }  진행 상황
    { "type": "finish", "result": {speed, accuracy, typoCount, seconds} }     다 쳤음
    { "type": "reset" }                                 한 판 더 (방장만, 끝난 뒤)
    """

    kind = "typing"

    def __init__(self, room_id: str):
        super().__init__(room_id)
        self.sentence: dict | None = None
        self.finished_count = 0  # 지금까지 완료한 사람 수 → 다음 완료자의 등수 계산용
        # 몇 번째 판인지. 시작할 때마다 1씩 올라가요.
        # 프론트는 이 값이 바뀌면 "새 판"으로 보고 입력 영역을 새로 만들어요. (React key로 사용)
        self.round = 0
        # 카운트다운 후 playing으로 바꿔줄 비동기 작업. 방이 정리될 때 취소하려고 들고 있어요.
        self._countdown_task: asyncio.Task | None = None

    def player_to_dict(self, player: Player) -> dict:
        return {
            **super().player_to_dict(player),  # id, nickname, isHost
            "ready": player.ready,
            "progress": player.progress,
            "speed": player.speed,
            "accuracy": player.accuracy,
            "finished": player.finished,
            "rank": player.rank,
            "result": player.result,
        }

    def to_dict(self) -> dict:
        return {
            **super().to_dict(),
            "sentence": self.sentence,
            "round": self.round,
            "countdownSeconds": COUNTDOWN_SECONDS,
        }

    async def handle(self, player: Player, message: dict) -> None:
        kind = message.get("type")

        if kind == "ready" and self.status == "waiting":
            player.ready = bool(message.get("ready"))

        elif kind == "start":
            error = self._start_error(player, message.get("sentence"))
            if error:
                await self.send(player, {"type": "error", "message": error})
                return
            self._start(message["sentence"])

        elif kind == "progress" and self.status == "playing" and not player.finished:
            # 클라이언트가 보낸 숫자는 믿지 말고 범위를 한 번 확인해서 넣어요.
            player.progress = _clamp(message.get("progress"), 0, 1)
            player.speed = int(_clamp(message.get("speed"), 0, 5000))
            player.accuracy = _clamp(message.get("accuracy"), 0, 100)

        elif kind == "finish" and self.status == "playing" and not player.finished:
            self._finish(player, message.get("result") or {})

        elif kind == "reset" and player.id == self.host_id and self.status == "finished":
            self.status = "waiting"
            for p in self.players.values():
                p.reset_game_state()

        else:
            # 지금 상태에서 처리할 수 없는 메시지는 무시 (예: 게임 중에 ready)
            return

        await self.broadcast_state()

    def _start_error(self, player: Player, sentence) -> str | None:
        if player.id != self.host_id:
            return "방장만 시작할 수 있어요."
        if self.status != "waiting":
            return "지금은 시작할 수 없어요."
        if len(self.players) < 2:
            return "친구가 한 명 이상 들어와야 시작할 수 있어요."
        if not all(p.ready for p in self.players.values() if p.id != self.host_id):
            return "모두 준비해야 시작할 수 있어요."
        if not isinstance(sentence, dict) or not isinstance(sentence.get("text"), str):
            return "문장 정보가 올바르지 않아요."
        if not 1 <= len(sentence["text"]) <= 500:
            return "문장 길이가 올바르지 않아요."
        return None

    def _start(self, sentence: dict) -> None:
        self.sentence = {
            "id": str(sentence.get("id", "")),
            "text": sentence["text"],
            "source": str(sentence.get("source", "")),
        }
        self.status = "countdown"
        self.round += 1
        self.finished_count = 0
        for p in self.players.values():
            p.reset_game_state()

        # 3초 기다렸다가 playing으로 바꾸는 작업을 "백그라운드"로 실행해요.
        # 여기서 await asyncio.sleep(3)을 직접 하면 그 3초 동안 이 사람의 다른 메시지를 못 받아요.
        self._countdown_task = asyncio.create_task(self._run_countdown())

    async def _run_countdown(self) -> None:
        await asyncio.sleep(COUNTDOWN_SECONDS)
        # 기다리는 사이 다들 나가서 방이 바뀌었을 수도 있으니 상태를 다시 확인
        if self.status == "countdown":
            self.status = "playing"
            await self.broadcast_state()

    def _finish(self, player: Player, result: dict) -> None:
        self.finished_count += 1
        player.finished = True
        player.rank = self.finished_count
        player.progress = 1.0
        player.result = {
            "speed": int(_clamp(result.get("speed"), 0, 5000)),
            "accuracy": _clamp(result.get("accuracy"), 0, 100),
            "typoCount": int(_clamp(result.get("typoCount"), 0, 10000)),
            "seconds": _clamp(result.get("seconds"), 0, 3600),
        }
        player.speed = player.result["speed"]
        player.accuracy = player.result["accuracy"]
        self._check_all_finished()

    def _check_all_finished(self) -> None:
        if self.status == "playing" and all(p.finished for p in self.players.values()):
            self.status = "finished"

    def on_player_left(self, player_id: str) -> None:
        # 아직 안 끝난 사람이 나가면, 남은 사람들이 전부 끝났을 수 있으니 다시 확인
        self._check_all_finished()

    def close(self) -> None:
        """방이 사라질 때 진행 중인 카운트다운 작업도 같이 정리"""
        _cancel(self._countdown_task)

    def reset_game(self) -> None:
        super().reset_game()
        self.finished_count = 0


class RelayRoom(Room):
    """친구와 공동 이어쓰기 방.

    [상태 흐름]
    waiting ──(방장이 start)──▶ writing ──(정해진 차례를 다 돌거나, 쓰는 사람이 "완결")──▶ finished
       ▲                                                          │
       └──────────────(방장이 reset: 새 이야기)────────────────────┘

    [차례 관리]
    order:        시작할 때 정해진 쓰는 순서 (참가자 id 목록, 들어온 순서)
    writer_index: order 중 지금 쓰는 사람의 위치
    turns_done:   지금까지 끝난 차례 수. total_turns(= 바퀴 수 × 인원)에 닿으면 완성
                  ("바퀴 수 없음" 모드면 total_turns = 0 → 차례 수로는 끝나지 않고 "완결"을 눌러야 끝나요)

    [클라이언트 → 서버 메시지]
    { "type": "settings", "settings": { laps, turnSeconds, visibility, prompt } }  설정 변경 (방장만, 대기 중)
    { "type": "start" }                     시작 (방장만, 2명 이상)
    { "type": "submit", "text": "..." }     내 차례 글 제출 → 다음 사람 차례로
    { "type": "finish", "text": "..." }     내 차례 글을 마지막으로 이야기 완결 (지금 쓰는 사람만)
    { "type": "reset" }                     새 이야기 (방장만, 완성 후)
    """

    kind = "relay"

    def __init__(self, room_id: str):
        super().__init__(room_id)
        # 방장이 대기실에서 바꿀 수 있는 설정
        self.settings = {
            "laps": 2,  # 몇 바퀴 돌지 (0 = 바퀴 수 없이 "완결" 누를 때까지)
            "turnSeconds": 90,  # 한 차례 제한 시간 (0 = 제한 없음)
            "visibility": "all",  # "all" = 앞 내용 전부 보기 / "last" = 바로 앞 사람 글만 보기
            "prompt": None,  # 랜덤 소재 { genre: "추리", ... } 또는 None
        }
        self.order: list[str] = []
        self.writer_index = 0
        self.turns_done = 0
        self.total_turns = 0
        # 지금까지 쓴 이야기 조각들. [{ "playerId", "nickname", "text" }, ...]
        self.story: list[dict] = []
        self.turn_deadline: float | None = None  # 이번 차례가 끝나는 시각 (time.time() 기준)
        # 차례가 바뀔 때마다 1씩 올라가는 번호.
        # 1) 프론트: 이 값을 React key로 써서, 차례가 바뀌면 글쓰기 칸을 새로 만들어요.
        # 2) 서버: 시간 초과 타이머가 "내가 맡은 차례가 아직 그대로인지" 확인하는 데 써요.
        self.turn_id = 0
        self._turn_task: asyncio.Task | None = None

    @property
    def current_writer_id(self) -> str | None:
        if self.status != "writing" or not self.order:
            return None
        return self.order[self.writer_index]

    def to_dict(self) -> dict:
        # 남은 시간은 "몇 초 남았는지"로 보내요.
        # 서버 시각을 그대로 보내면 내 PC 시계와 서버 시계가 다를 때 어긋나기 때문에,
        # 프론트는 받은 순간부터 이 초를 거꾸로 세기만 하면 돼요.
        turn_ends_in = None
        if self.turn_deadline is not None:
            turn_ends_in = max(0.0, self.turn_deadline - time.time())
        return {
            **super().to_dict(),
            "settings": self.settings,
            "order": self.order,
            "currentWriterId": self.current_writer_id,
            "turnId": self.turn_id,
            "turnsDone": self.turns_done,
            "totalTurns": self.total_turns,
            "turnEndsIn": turn_ends_in,
            "story": self.story,
        }

    async def handle(self, player: Player, message: dict) -> None:
        kind = message.get("type")
        is_host = player.id == self.host_id

        if kind == "settings" and is_host and self.status == "waiting":
            self._update_settings(message.get("settings") or {})

        elif kind == "start" and is_host and self.status == "waiting":
            if len(self.players) < 2:
                await self.send(player, {"type": "error", "message": "친구가 한 명 이상 들어와야 시작할 수 있어요."})
                return
            self._start()

        elif kind in ("submit", "finish") and player.id == self.current_writer_id:
            text = message.get("text")
            text = text.strip() if isinstance(text, str) else ""
            if len(text) > RELAY_MAX_TEXT:
                await self.send(player, {"type": "error", "message": f"한 번에 {RELAY_MAX_TEXT}자까지 쓸 수 있어요."})
                return
            # 완결은 이야기가 한 줄이라도 있어야 할 수 있어요. (빈 이야기로 끝나면 저장할 게 없으니까)
            if kind == "finish" and not text and not self.story:
                await self.send(player, {"type": "error", "message": "한 줄이라도 쓰고 완결할 수 있어요."})
                return
            # 빈 글은 이야기에 넣지 않고 차례만 넘겨요. (시간 초과로 아무것도 못 쓴 경우)
            if text:
                self.story.append({"playerId": player.id, "nickname": player.nickname, "text": text})
            if kind == "finish":
                self.turns_done += 1
                self._finish()
            else:
                self._next_turn()

        elif kind == "reset" and is_host and self.status == "finished":
            self.status = "waiting"
            self.story = []
            self.order = []
            self.turns_done = 0
            self.total_turns = 0

        else:
            return

        await self.broadcast_state()

    def _update_settings(self, new: dict) -> None:
        """방장이 보낸 설정 중 올바른 값만 골라서 반영해요. (이상한 값은 무시)"""
        laps = new.get("laps")
        # bool은 파이썬에서 int의 한 종류라(True == 1) 따로 걸러줘요.
        if isinstance(laps, int) and not isinstance(laps, bool) and (
            RELAY_LAPS_MIN <= laps <= RELAY_LAPS_MAX or laps == RELAY_LAPS_UNLIMITED
        ):
            self.settings["laps"] = laps

        seconds = new.get("turnSeconds")
        if seconds in RELAY_TURN_SECONDS and not isinstance(seconds, bool):
            self.settings["turnSeconds"] = seconds

        if new.get("visibility") in ("all", "last"):
            self.settings["visibility"] = new["visibility"]

        if "prompt" in new:
            prompt = new["prompt"]
            if isinstance(prompt, dict) and len(prompt) <= 10:
                # 문자열 값만, 너무 길지 않게 정리해서 저장 (하나도 안 남으면 None)
                cleaned = {str(k)[:20]: v[:50] for k, v in prompt.items() if isinstance(v, str)}
                self.settings["prompt"] = cleaned or None
            else:
                self.settings["prompt"] = None

    def _start(self) -> None:
        self.status = "writing"
        self.order = list(self.players)  # 들어온 순서대로 차례
        self.writer_index = 0
        self.turns_done = 0
        # 바퀴 수 없음(0)이면 total_turns도 0 → 차례 수로는 끝나지 않아요.
        self.total_turns = self.settings["laps"] * len(self.order)
        self.story = []
        self._begin_turn()

    def _begin_turn(self) -> None:
        """새 차례 시작: 차례 번호를 올리고, 제한 시간이 있으면 시간 초과 타이머를 걸어요."""
        self.turn_id += 1
        _cancel(self._turn_task)
        seconds = self.settings["turnSeconds"]
        if seconds:
            self.turn_deadline = time.time() + seconds
            self._turn_task = asyncio.create_task(self._turn_timeout(self.turn_id, seconds))
        else:
            self.turn_deadline = None
            self._turn_task = None

    async def _turn_timeout(self, turn_id: int, seconds: int) -> None:
        """시간이 다 되면 원래는 쓰는 사람 화면이 알아서 지금까지 쓴 글을 제출해요.
        그런데 그 사람이 탭을 내려놓았거나 네트워크가 느리면 제출이 안 올 수 있어서,
        서버도 몇 초 더 기다렸다가 그래도 차례가 그대로면 강제로 넘겨요. (게임이 멈추지 않게)"""
        await asyncio.sleep(seconds + TURN_GRACE_SECONDS)
        if self.status == "writing" and self.turn_id == turn_id:
            self._next_turn()
            await self.broadcast_state()

    def _next_turn(self) -> None:
        self.turns_done += 1
        # 끝나는 경우: 정해진 차례를 다 돌았을 때 / 바퀴 수 없음 모드의 안전 상한 / 남은 사람이 없을 때
        reached_total = self.total_turns and self.turns_done >= self.total_turns
        reached_cap = self.turns_done >= RELAY_UNLIMITED_MAX_TURNS
        if reached_total or reached_cap or not self.order:
            self._finish()
            return
        self.writer_index = (self.writer_index + 1) % len(self.order)
        self._begin_turn()

    def _finish(self) -> None:
        self.status = "finished"
        self.turn_deadline = None
        _cancel(self._turn_task)
        self._turn_task = None

    def on_player_left(self, player_id: str) -> None:
        if self.status != "writing" or player_id not in self.order:
            return
        index = self.order.index(player_id)
        self.order.remove(player_id)
        if not self.order:
            self._finish()
            return

        if index < self.writer_index:
            # 지금 쓰는 사람보다 앞 순서의 사람이 나가면, 목록이 한 칸씩 당겨지니까 위치도 한 칸 당겨요.
            self.writer_index -= 1
        elif index == self.writer_index:
            # 지금 쓰던 사람이 나갔으면, 같은 위치에 있는 "다음 사람"이 이어서 써요.
            # (목록이 당겨져서 같은 index가 다음 사람을 가리켜요. 맨 끝이었다면 처음으로)
            self.writer_index %= len(self.order)
            self._begin_turn()  # 새 사람에게 시간을 처음부터 다시 줘요

    def close(self) -> None:
        _cancel(self._turn_task)

    def reset_game(self) -> None:
        super().reset_game()
        self.story = []
        self.order = []
        self.turns_done = 0
        self.total_turns = 0
        self.turn_deadline = None


def _cancel(task: asyncio.Task | None) -> None:
    """돌고 있는 비동기 작업(타이머)이 있으면 취소해요."""
    if task and not task.done():
        task.cancel()


def _clamp(value, low: float, high: float) -> float:
    """숫자가 아니면 low, 범위를 벗어나면 범위 안으로 잘라서 돌려줘요."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return low
    return max(low, min(high, number))


# 방 종류 이름 → 클래스. 새 게임 방을 만들면 여기에 추가하면 돼요.
ROOM_CLASSES: dict[str, type[Room]] = {
    "typing": TypingRoom,
    "relay": RelayRoom,
}


@dataclass
class RoomManager:
    rooms: dict[str, Room] = field(default_factory=dict)

    def create(self, kind: str) -> Room:
        self._cleanup_stale_rooms()
        # 이미 있는 코드와 겹치지 않을 때까지 새로 뽑아요. (경우의 수가 수천만 개라 거의 한 번에 끝남)
        while True:
            room_id = "".join(secrets.choice(ROOM_CODE_CHARS) for _ in range(ROOM_CODE_LENGTH))
            if room_id not in self.rooms:
                break
        room = ROOM_CLASSES[kind](room_id)
        self.rooms[room_id] = room
        return room

    def get(self, room_id: str) -> Room | None:
        # 사용자가 소문자로 입력해도 찾을 수 있게 대문자로 바꿔서 찾아요.
        return self.rooms.get(room_id.upper())

    def remove(self, room_id: str) -> None:
        room = self.rooms.pop(room_id, None)
        if room is not None:
            room.close()

    def _cleanup_stale_rooms(self) -> None:
        """오래 비어 있는 방 정리 (새 방을 만들 때마다 한 번씩 훑어요)"""
        now = time.time()
        for room_id, room in list(self.rooms.items()):
            if room.empty_since is not None and now - room.empty_since > EMPTY_ROOM_TTL_SECONDS:
                self.remove(room_id)


# 서버 전체에서 함께 쓰는 방 관리자 하나
room_manager = RoomManager()

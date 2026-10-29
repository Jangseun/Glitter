import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { RoomGate, RoomInvite, RoomShell } from "../components/RoomFrame"
import TypingBoard from "../components/TypingBoard"
import { useRoomNickname } from "../hooks/useRoomNickname"
import { useRoomSocket } from "../hooks/useRoomSocket"
import { useAuth } from "../context/AuthContext"
import { useTypingSession } from "../hooks/useTypingSession"
import { saveRecord } from "../services/recordsApi"
import { randomText, toTypingText } from "../services/textsApi"
import "./TypingBattle.css"

// 친구와 타자 대결 - 방 화면 (/typing/battle/:roomId)
//
// 화면은 서버가 보내주는 room.status에 따라 바뀌어요.
//   waiting   → 대기실 (방 코드, 참가자, 준비/시작 버튼)
//   countdown → 3, 2, 1 (입력 막힘)
//   playing   → 타자 치기 + 모두의 진행률
//   finished  → 순위표
// 상태를 바꾸는 건 항상 서버예요. 프론트는 서버에 "준비/시작/진행률/완료"를 보내고,
// 서버가 돌려준 room 상태를 그대로 그리기만 해요. (그래야 모든 사람 화면이 똑같이 맞춰져요)
const TypingBattleRoom = () => {
  const { roomId } = useParams()

  // 닉네임: 전에 쓴 닉네임 → 로그인 닉네임 → 둘 다 없으면 입력 화면 (hooks/useRoomNickname.js)
  const { nickname, checking, choose } = useRoomNickname()
  const socket = useRoomSocket(roomId, nickname)

  return (
    <RoomGate
      roomId={roomId}
      nickname={nickname}
      checkingAuth={checking}
      onNickname={choose}
      socket={socket}
      backTo="/typing/battle"
      title="친구와 타자 대결"
    >
      {() => <BattleRoom {...socket} />}
    </RoomGate>
  )
}

// 방에 들어온 뒤의 화면 (RoomGate가 room/playerId가 준비됐을 때만 그려줘요)
const BattleRoom = ({ room, playerId, notice, send }) => {
  const isHost = room.hostId === playerId

  return (
    <RoomShell backTo="/typing/battle" title={`타자 대결 · ${room.id}`}>
      {notice && <p className="tbr-notice">{notice}</p>}

      {room.status === "waiting" && <WaitingRoom room={room} playerId={playerId} isHost={isHost} send={send} />}

      {(room.status === "countdown" || room.status === "playing") && (
        <>
          <PlayerLanes players={room.players} playerId={playerId} />
          {/*
            key={room.round}: 새 판이 시작될 때마다 BattlePlay를 "새로" 만들어요.
            그러면 안에 있는 useTypingSession의 상태(입력값, 기록)가 처음부터 다시 시작돼서
            따로 reset을 부를 필요가 없어요. (React는 key가 바뀌면 컴포넌트를 버리고 새로 만듦)
          */}
          <BattlePlay
            key={room.round}
            text={room.sentence.text}
            // 서버는 글 번호를 문자열로 보관해서 숫자로 바꿔 넘겨요 (기록에 "어떤 글"인지 남기려고)
            sentenceId={Number(room.sentence.id) || null}
            status={room.status}
            countdownSeconds={room.countdownSeconds}
            me={room.players.find((p) => p.id === playerId)}
            send={send}
          />
        </>
      )}

      {room.status === "finished" && <BattleResults room={room} playerId={playerId} isHost={isHost} send={send} />}
    </RoomShell>
  )
}

// ---------- 대기실 ----------
const WaitingRoom = ({ room, playerId, isHost, send }) => {
  const others = room.players.filter((p) => p.id !== room.hostId)
  const me = room.players.find((p) => p.id === playerId)

  // 시작 조건: 2명 이상 + 방장 말고 전원 준비 (서버도 똑같이 검사해요)
  let startBlockedReason = ""
  if (room.players.length < 2) startBlockedReason = "친구가 들어오면 시작할 수 있어요."
  else if (!others.every((p) => p.ready)) startBlockedReason = "모두 준비하면 시작할 수 있어요."

  // 방장이 시작하면 "이번에 칠 글"을 글 목록 API에서 무작위로 받아서 방 서버로 보내요.
  // 방 서버는 이 글을 모두에게 똑같이 나눠줘요. (직전 판과 같은 글은 피함)
  const [startError, setStartError] = useState("")
  const startGame = async () => {
    setStartError("")
    try {
      const text = await randomText({ exclude: room.sentence?.id })
      send({ type: "start", sentence: toTypingText(text) })
    } catch (err) {
      console.error(err)
      setStartError("글을 불러오지 못했어요. 다시 시도해주세요.")
    }
  }

  return (
    <div className="tbr-waiting">
      <RoomInvite roomId={room.id} />

      <section>
        <p className="tbr-label">
          참가자 {room.players.length} / {room.maxPlayers}
        </p>
        <ul className="tbr-players">
          {room.players.map((p) => (
            <li key={p.id}>
              <span className="tbr-name">
                {p.nickname}
                {p.id === playerId && <small> (나)</small>}
              </span>
              {p.isHost ? (
                <span className="badge host">방장</span>
              ) : (
                <span className={`badge${p.ready ? " ready" : ""}`}>{p.ready ? "준비 완료" : "대기 중"}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="tbr-actions">
        {isHost ? (
          <>
            <button type="button" className="btn primary" onClick={startGame} disabled={!!startBlockedReason}>
              시작하기
            </button>
            {(startBlockedReason || startError) && <span className="tbr-hint">{startError || startBlockedReason}</span>}
          </>
        ) : (
          <>
            <button
              type="button"
              className={`btn${me?.ready ? "" : " primary"}`}
              onClick={() => send({ type: "ready", ready: !me?.ready })}
            >
              {me?.ready ? "준비 취소" : "준비하기"}
            </button>
            <span className="tbr-hint">{me?.ready ? "방장이 시작하길 기다리는 중…" : "준비를 누르면 방장이 시작할 수 있어요."}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- 진행률 (모두의 레인) ----------
const PlayerLanes = ({ players, playerId }) => (
  <ul className="lanes">
    {players.map((p) => (
      <li key={p.id} className={p.id === playerId ? "me" : ""}>
        <span className="lane-name">
          {p.nickname}
          {p.id === playerId && <small> (나)</small>}
        </span>
        <div className="lane-track">
          <div className="lane-bar" style={{ width: `${p.progress * 100}%` }} />
        </div>
        <span className="lane-stat">{p.finished ? `${p.rank}등` : `${p.speed}타`}</span>
      </li>
    ))}
  </ul>
)

// ---------- 타자 치는 영역 ----------
// room.round가 바뀔 때마다 새로 만들어져요. (위의 key={room.round} 주석 참고)
const BattlePlay = ({ text, sentenceId, status, countdownSeconds, me, send }) => {
  const isPlaying = status === "playing"

  // 혼자 연습과 똑같은 입력 로직을 그대로 써요. 카운트다운 중에는 disabled로 입력을 막아요.
  const session = useTypingSession(text, { disabled: !isPlaying })
  const { stats, isFinished } = session

  // 진행 상황을 서버로 보내요.
  // 키 입력을 하나하나 보내지 않고, 글자가 확정되거나(progress 변화) 타수가 갱신될 때(0.2초 타이머)
  // "진행률/타수/정확도" 숫자 3개만 보내요. → 친구 화면의 레인이 실시간으로 움직여요.
  useEffect(() => {
    if (!isPlaying || isFinished) return
    send({ type: "progress", progress: stats.progress, speed: stats.speed, accuracy: stats.accuracy })
  }, [isPlaying, isFinished, stats.progress, stats.speed, stats.accuracy, send])

  // 다 치면 최종 기록을 딱 한 번 보내요.
  // stats는 렌더링마다 새 객체라 이 effect가 여러 번 실행될 수 있어서, ref로 "이미 보냈음"을 기억해요.
  const { user } = useAuth()
  const finishSentRef = useRef(false)
  useEffect(() => {
    if (!isFinished || finishSentRef.current) return
    finishSentRef.current = true
    send({
      type: "finish",
      result: { speed: stats.speed, accuracy: stats.accuracy, typoCount: stats.typoCount, seconds: stats.seconds },
    })
    // 로그인했으면 내 타자 기록에도 남겨요 ("대결" 기록으로). 실패해도 대결 진행엔 지장 없게 조용히
    if (user) {
      saveRecord({ mode: "battle", textId: sentenceId, stats, charCount: text.length }).catch((err) =>
        console.error("기록 저장 실패", err),
      )
    }
  }, [isFinished, stats, send, user, sentenceId, text])

  return (
    <div className="tbr-play">
      <TypingBoard session={session} />
      {status === "countdown" && <Countdown seconds={countdownSeconds} />}
      {isFinished && (
        <p className="tbr-wait">
          {me?.rank ? `${me.rank}등으로 들어왔어요!` : "다 쳤어요!"} 다른 사람이 끝나길 기다리는 중…
        </p>
      )}
    </div>
  )
}

// 3, 2, 1 숫자. 실제로 게임을 시작시키는 건 서버고(3초 후 playing으로 바꿔서 보내줌),
// 이건 화면에 숫자만 보여주는 용도예요.
const Countdown = ({ seconds }) => {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    const id = setInterval(() => setLeft((n) => Math.max(1, n - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="countdown">
      {/* key={left}: 숫자가 바뀔 때마다 새로 그려져서 등장 애니메이션이 다시 재생돼요 */}
      <span key={left}>{left}</span>
    </div>
  )
}

// ---------- 결과 ----------
const BattleResults = ({ room, playerId, isHost, send }) => {
  // 완료한 사람은 등수 순서로, 못 끝낸 사람(중간에 나감 등)은 맨 뒤로
  const ranked = [...room.players].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))

  return (
    <div className="tbr-results">
      <h2 className="tbr-results-title">
        🏆 {ranked[0]?.rank === 1 ? `${ranked[0].nickname} 우승!` : "결과"}
      </h2>

      <div className="table-wrap">
        <table className="tbr-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>닉네임</th>
              <th>타수</th>
              <th>정확도</th>
              <th>오타</th>
              <th>시간</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => (
              <tr key={p.id} className={p.id === playerId ? "me" : ""}>
                <td>{p.rank ?? "-"}</td>
                <td>
                  {p.nickname}
                  {p.id === playerId && <small> (나)</small>}
                </td>
                <td>{p.result ? `${p.result.speed}타` : "-"}</td>
                <td>{p.result ? `${p.result.accuracy}%` : "-"}</td>
                <td>{p.result ? p.result.typoCount : "-"}</td>
                <td>{p.result ? `${p.result.seconds.toFixed(1)}초` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tbr-actions">
        {isHost ? (
          <button type="button" className="btn primary" onClick={() => send({ type: "reset" })}>
            한 판 더
          </button>
        ) : (
          <span className="tbr-hint">방장이 한 판 더 하길 기다리는 중…</span>
        )}
      </div>
    </div>
  )
}

export default TypingBattleRoom

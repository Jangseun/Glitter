import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import MyPromptsSelect from "../components/MyPromptsSelect"
import PromptCard from "../components/PromptCard"
import PromptPicker from "../components/PromptPicker"
import { RoomGate, RoomInvite, RoomShell } from "../components/RoomFrame"
import { useAuth } from "../context/AuthContext"
import { useRoomNickname } from "../hooks/useRoomNickname"
import { useRoomSocket } from "../hooks/useRoomSocket"
import { createWork } from "../services/worksApi"
import "./WritingRelay.css"

// 백엔드(services/rooms.py의 RELAY_*)와 같은 값이어야 해요.
// 0 = "바퀴 수 없음": 정해진 차례 없이 돌다가, 쓰는 사람이 "완결"을 눌러야 끝나요.
const LAP_OPTIONS = [0, 1, 2, 3, 4, 5]
const lapLabel = (n) => (n === 0 ? "완결할 때까지" : `${n}바퀴`)
const TURN_SECONDS_OPTIONS = [
  { value: 0, label: "제한 없음" },
  { value: 60, label: "1분" },
  { value: 90, label: "1분 30초" },
  { value: 120, label: "2분" },
  { value: 180, label: "3분" },
]
const MAX_TEXT = 1000

// 친구와 공동 이어쓰기 - 방 화면 (/writing/room/:roomId)
//
// 화면은 서버가 보내주는 room.status에 따라 바뀌어요.
//   waiting  → 대기실 (방 코드, 참가자, 규칙 설정)
//   writing  → 한 사람씩 돌아가며 쓰기 (내 차례면 입력칸 + 넘기기/완결 버튼, 아니면 "OO님이 쓰는 중…")
//   finished → 완성된 이야기 + 작품으로 저장
// 차례를 넘기고 시간을 재는 건 서버가 하고, 프론트는 받은 상태를 그리기만 해요.
const WritingRelayRoom = () => {
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
      backTo="/writing/relay"
      title="친구와 이어쓰기"
    >
      {() => <RelayRoom {...socket} />}
    </RoomGate>
  )
}

// 방에 들어온 뒤의 화면 (RoomGate가 room/playerId가 준비됐을 때만 그려줘요)
const RelayRoom = ({ room, playerId, notice, send }) => {
  const isHost = room.hostId === playerId

  return (
    <RoomShell backTo="/writing/relay" title={`이어쓰기 · ${room.id}`}>
      {notice && <p className="wr-notice">{notice}</p>}

      {room.status === "waiting" && <RelayWaiting room={room} playerId={playerId} isHost={isHost} send={send} />}

      {/*
        key={room.turnId}: 차례가 바뀔 때마다 RelayWriting을 "새로" 만들어요.
        그러면 입력칸(draft), 타이머, "제출했음" 표시가 자동으로 처음 상태로 돌아가요.
      */}
      {room.status === "writing" && <RelayWriting key={room.turnId} room={room} playerId={playerId} send={send} />}

      {room.status === "finished" && <RelayFinished room={room} isHost={isHost} send={send} />}
    </RoomShell>
  )
}

// ---------- 대기실 ----------
const RelayWaiting = ({ room, playerId, isHost, send }) => {
  const { settings } = room

  // 바꾼 항목 하나만 보내요. 서버가 기존 설정에 합쳐서 모두에게 다시 보내줘요.
  const updateSetting = (key, value) => send({ type: "settings", settings: { [key]: value } })

  const totalTurns = settings.laps * room.players.length
  const lapsHint =
    settings.laps === 0
      ? "정해진 차례 없이 계속 돌아가요. 자기 차례에 \"완결\"을 누르면 이야기가 끝나요."
      : `총 ${totalTurns}차례 (${room.players.length}명 × ${settings.laps}바퀴) · 중간에 완결할 수도 있어요`

  return (
    <div className="wr-waiting">
      <RoomInvite roomId={room.id} />

      <section>
        <p className="wr-label">
          참가자 {room.players.length} / {room.maxPlayers} · 들어온 순서대로 차례가 돌아가요
        </p>
        <ol className="wr-players">
          {room.players.map((p) => (
            <li key={p.id}>
              {p.nickname}
              {p.id === playerId && <small> (나)</small>}
              {p.isHost && <span className="badge host">방장</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="wr-settings">
        <p className="wr-label">규칙 {isHost ? "" : "(방장이 정해요)"}</p>

        <SettingRow label="바퀴 수" hint={lapsHint}>
          {LAP_OPTIONS.map((n) => (
            <SegButton key={n} active={settings.laps === n} disabled={!isHost} onClick={() => updateSetting("laps", n)}>
              {lapLabel(n)}
            </SegButton>
          ))}
        </SettingRow>

        <SettingRow label="한 차례 시간" hint="시간이 다 되면 쓰던 데까지 자동으로 넘어가요">
          {TURN_SECONDS_OPTIONS.map((o) => (
            <SegButton
              key={o.value}
              active={settings.turnSeconds === o.value}
              disabled={!isHost}
              onClick={() => updateSetting("turnSeconds", o.value)}
            >
              {o.label}
            </SegButton>
          ))}
        </SettingRow>

        <SettingRow
          label="앞 내용"
          hint={settings.visibility === "last" ? "바로 앞 사람 글만 보고 써요. 전체 이야기는 끝나고 공개!" : "지금까지 쓴 이야기를 전부 보면서 써요"}
        >
          <SegButton active={settings.visibility === "all"} disabled={!isHost} onClick={() => updateSetting("visibility", "all")}>
            전부 보기
          </SegButton>
          <SegButton active={settings.visibility === "last"} disabled={!isHost} onClick={() => updateSetting("visibility", "last")}>
            바로 앞 글만
          </SegButton>
        </SettingRow>

        <div className="wr-prompt">
          <p className="wr-setting-label">랜덤 소재 (선택)</p>
          {isHost ? (
            <>
              {/* 방장 화면에서 뽑은 소재를 서버로 보내면, 모두의 화면에 같은 소재가 보여요 */}
              <PromptPicker value={settings.prompt} onChange={(prompt) => updateSetting("prompt", prompt)} />
              <MyPromptsSelect onSelect={(prompt) => updateSetting("prompt", prompt)} />
              {settings.prompt && (
                <button type="button" className="btn wr-prompt-clear" onClick={() => updateSetting("prompt", null)}>
                  소재 없이 하기
                </button>
              )}
            </>
          ) : settings.prompt ? (
            <PromptCard prompt={settings.prompt} />
          ) : (
            <p className="wr-hint">소재 없이 자유롭게 써요.</p>
          )}
        </div>
      </section>

      <div className="wr-actions">
        {isHost ? (
          <>
            <button
              type="button"
              className="btn primary"
              onClick={() => send({ type: "start" })}
              disabled={room.players.length < 2}
            >
              시작하기
            </button>
            {room.players.length < 2 && <span className="wr-hint">친구가 들어오면 시작할 수 있어요.</span>}
          </>
        ) : (
          <span className="wr-hint">방장이 시작하길 기다리는 중…</span>
        )}
      </div>
    </div>
  )
}

const SettingRow = ({ label, hint, children }) => (
  <div className="wr-setting">
    <p className="wr-setting-label">{label}</p>
    <div className="seg">{children}</div>
    {hint && <p className="wr-hint">{hint}</p>}
  </div>
)

// 여러 개 중 하나를 고르는 버튼 (방장이 아니면 눌리지 않고 보기만 해요)
const SegButton = ({ active, disabled, onClick, children }) => (
  <button type="button" className={`seg-btn${active ? " on" : ""}`} disabled={disabled} onClick={onClick} aria-pressed={active}>
    {children}
  </button>
)

// ---------- 쓰는 중 ----------
// room.turnId가 바뀔 때마다(= 차례가 바뀔 때마다) 새로 만들어져요. (위의 key 주석 참고)
const RelayWriting = ({ room, playerId, send }) => {
  const isMyTurn = room.currentWriterId === playerId
  const writer = room.players.find((p) => p.id === room.currentWriterId)
  const hideHistory = room.settings.visibility === "last"

  const [draft, setDraft] = useState("")
  const submittedRef = useRef(false) // 한 차례에 두 번 제출하지 않게 (시간 초과 자동 제출 + 버튼 클릭 등)

  // ---- 남은 시간 ----
  // 서버는 "몇 초 남았는지(turnEndsIn)"를 보내줘요. 이 컴포넌트가 처음 만들어질 때(= 새 차례 시작)
  // "지금 시각 + 남은 초"로 마감 시각을 한 번만 계산해 두고, 그 뒤엔 내 PC 시계로 거꾸로 세요.
  // (useState에 함수를 넘기면 첫 렌더링 때만 실행돼서, 이후 렌더링마다 다시 계산되지 않아요)
  const [deadline] = useState(() => (room.turnEndsIn == null ? null : Date.now() + room.turnEndsIn * 1000))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [deadline])

  const secondsLeft = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))

  // type: "submit" = 다음 사람에게 넘기기, "finish" = 내 글을 마지막으로 이야기 완결
  const submit = (text, type = "submit") => {
    if (submittedRef.current) return
    submittedRef.current = true
    send({ type, text })
  }

  // 완결은 되돌릴 수 없어서 한 번 물어봐요.
  // 이야기가 한 줄도 없으면 완결할 게 없으니 버튼을 막아둬요. (서버도 같은 경우를 거절해요)
  const canFinish = draft.trim() !== "" || room.story.length > 0
  const finish = () => {
    if (!window.confirm("이야기를 여기서 완결할까요? 지금 쓴 글이 마지막 조각이 돼요.")) return
    submit(draft, "finish")
  }

  // 내 차례인데 시간이 다 되면, 지금까지 쓴 만큼 자동으로 제출해요. (빈 글이면 서버가 그냥 차례만 넘겨요)
  // 혹시 이 제출이 안 가도(탭이 백그라운드 등) 서버가 5초 뒤 강제로 넘겨서 게임이 멈추진 않아요.
  useEffect(() => {
    if (isMyTurn && secondsLeft === 0) submit(draft)
  })

  const handleKeyDown = (e) => {
    // Ctrl+Enter (맥은 Cmd+Enter)로 바로 넘기기. 그냥 Enter는 줄바꿈으로 써야 하니까 막지 않아요.
    // isComposing: 한글 조합 중 Enter는 글자 확정용이라 제출하지 않아요.
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (draft.trim()) submit(draft)
    }
  }

  const authorIndex = getAuthorIndex(room)

  return (
    <div className="wr-writing">
      <div className="wr-turnbar">
        <span>
          {/* 바퀴 수 없음 모드(totalTurns = 0)면 전체 차례 수 없이 몇 번째인지만 */}
          {room.totalTurns ? `${room.turnsDone + 1} / ${room.totalTurns}번째 차례` : `${room.turnsDone + 1}번째 차례 · 완결할 때까지`}
        </span>
        {secondsLeft !== null && (
          <span className={`wr-timer${secondsLeft <= 10 ? " urgent" : ""}`}>{formatSeconds(secondsLeft)}</span>
        )}
      </div>

      <ol className="wr-order">
        {room.order.map((id) => {
          const p = room.players.find((x) => x.id === id)
          return (
            <li key={id} className={id === room.currentWriterId ? "now" : ""}>
              {p?.nickname ?? "?"}
              {id === playerId && " (나)"}
            </li>
          )
        })}
      </ol>

      {room.settings.prompt && <PromptCard prompt={room.settings.prompt} body={isMyTurn ? storyText(room.story) + draft : undefined} />}

      <StoryView story={room.story} authorIndex={authorIndex} onlyLast={hideHistory} />

      {isMyTurn ? (
        <div className="wr-editor">
          <p className="wr-label">✍️ 내 차례예요! 앞 내용을 이어서 써주세요.</p>
          {/* 일반 controlled textarea라 한글 입력에 문제없어요. (WritingSolo.jsx의 textarea 주석 참고) */}
          <textarea
            className="wr-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_TEXT}
            placeholder={room.story.length ? "이야기를 이어서…" : "이야기의 첫 문장을 써주세요."}
            autoFocus
          />
          <div className="wr-editor-foot">
            <span className="wr-hint">
              {draft.length} / {MAX_TEXT}자 · Ctrl+Enter로 넘기기
            </span>
            <div className="wr-editor-btns">
              <button type="button" className="btn" onClick={finish} disabled={!canFinish}>
                이걸로 완결
              </button>
              <button type="button" className="btn primary" onClick={() => submit(draft)} disabled={!draft.trim()}>
                다음 사람에게 넘기기
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="wr-waiting-turn">
          <span className="dots" aria-hidden="true" /> <b>{writer?.nickname}</b>님이 이어 쓰는 중…
        </p>
      )}
    </div>
  )
}

// 지금까지의 이야기. onlyLast면 마지막 조각만 보여주고 나머지는 숨겨요. ("바로 앞 글만" 모드)
const StoryView = ({ story, authorIndex, onlyLast = false }) => {
  if (story.length === 0) {
    return <p className="wr-empty-story">아직 아무도 쓰지 않았어요. 첫 문장이 이야기의 시작이에요!</p>
  }

  const visible = onlyLast ? story.slice(-1) : story
  const hiddenCount = story.length - visible.length

  return (
    <div className="story">
      {hiddenCount > 0 && <p className="story-hidden">앞의 {hiddenCount}개 조각은 이야기가 끝나면 공개돼요 🤫</p>}
      {visible.map((part, i) => (
        <div key={hiddenCount + i} className={`story-part author-${authorIndex(part.playerId) % 6}`}>
          <span className="story-author">{part.nickname}</span>
          <p className="story-text">{part.text}</p>
        </div>
      ))}
    </div>
  )
}

// ---------- 완성 ----------
const RelayFinished = ({ room, isHost, send }) => {
  const { user } = useAuth()
  const authorIndex = getAuthorIndex(room)
  const genre = room.settings.prompt?.genre
  const [title, setTitle] = useState(genre ? `${genre} 이어쓰기` : "함께 쓴 이야기")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  // 내가 저장한 작품 id. 저장하면 "작품 보러 가기" 링크로 바뀌어요.
  // 작품은 "저장한 사람의 작품함"에 들어가요. 그래서 참여자마다 각자 자기 작품함에 저장할 수 있어요.
  const [savedWorkId, setSavedWorkId] = useState(null)

  // 참여한 사람 닉네임 (처음 쓴 순서대로, 중복 없이)
  // Set: 같은 값을 한 번만 담는 자료구조라서 중복 제거에 써요.
  const authors = [...new Set(room.story.map((part) => part.nickname))]

  const handleSave = async () => {
    if (!title.trim()) {
      setError("제목을 입력해주세요.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      // 작품 저장은 기존 작품 API(POST /api/works)를 그대로 써요.
      // 조각마다 누가 썼는지는 본문에 따로 남지 않고, 조각 사이를 빈 줄로 이어 붙여요.
      const work = await createWork({
        title: title.trim(),
        body: storyText(room.story),
        mode: "relay",
        authors,
        prompt: room.settings.prompt,
      })
      setSavedWorkId(work.id)
    } catch (err) {
      console.error(err)
      setError(err.status === 401 ? "로그인이 필요해요." : "저장하지 못했어요. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="wr-finished">
      <h2 className="wr-finished-title">📖 이야기가 완성됐어요!</h2>
      {authors.length > 0 && <p className="wr-hint">함께 쓴 사람: {authors.join(", ")}</p>}

      {room.settings.prompt && <PromptCard prompt={room.settings.prompt} body={storyText(room.story)} />}

      <StoryView story={room.story} authorIndex={authorIndex} />

      <div className="wr-save">
        {savedWorkId ? (
          <Link to={`/works/${savedWorkId}`} className="btn primary">
            내 작품함에서 보기
          </Link>
        ) : user ? (
          <>
            <input
              className="field wr-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="작품 제목"
            />
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
              disabled={isSaving || room.story.length === 0}
            >
              {isSaving ? "저장 중…" : "내 작품함에 저장"}
            </button>
          </>
        ) : (
          // 로그인하러 이 페이지를 떠나면 방에서 나가게 돼서 완성된 이야기를 잃어요.
          // 그래서 로그인 화면은 "새 탭"으로 열고, 거기서 로그인하면 이 탭도 자동으로 로그인 상태가 돼요.
          // (AuthContext가 다른 탭의 로그인을 감지해요)
          <span className="wr-hint">
            저장하려면{" "}
            <a href="/login" target="_blank" rel="noreferrer">
              새 탭에서 로그인
            </a>
            해주세요. 로그인하면 여기에 저장 버튼이 생겨요.
          </span>
        )}
        {error && <span className="wr-error">{error}</span>}
      </div>

      {isHost && (
        <div className="wr-actions">
          <button type="button" className="btn" onClick={() => send({ type: "reset" })}>
            새 이야기 시작
          </button>
        </div>
      )}
    </div>
  )
}

// ---------- 도우미 ----------

// 이야기 조각들을 하나의 본문으로 (조각 사이는 빈 줄)
const storyText = (story) => story.map((part) => part.text).join("\n\n")

// 참가자마다 고정된 색 번호를 주는 함수를 돌려줘요. (같은 사람 글은 항상 같은 색)
// 쓰는 순서(order) 기준이고, 중간에 나가서 order에 없는 사람은 이야기에 처음 등장한 순서로 이어서 매겨요.
const getAuthorIndex = (room) => {
  const ids = [...room.order]
  for (const part of room.story) {
    if (!ids.includes(part.playerId)) ids.push(part.playerId)
  }
  return (id) => Math.max(0, ids.indexOf(id))
}

// 90 → "1:30"
const formatSeconds = (total) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`

export default WritingRelayRoom

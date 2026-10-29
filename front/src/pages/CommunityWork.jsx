import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import BackButton from "../components/BackButton"
import PromptCard from "../components/PromptCard"
import { useAuth } from "../context/AuthContext"
import {
  createComment,
  deleteComment,
  getPublicWork,
  likeWork,
  listComments,
  unlikeWork,
} from "../services/communityApi"
import { MODE_LABELS, formatDate } from "../utils/format"
import "./CommunityWork.css"

const COMMENT_MAX = 500 // 백엔드(schemas/community.py)와 같은 값

// 커뮤니티 작품 읽기 (/community/:workId) — 좋아요, 댓글
const CommunityWork = () => {
  const { workId } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const loginHref = `/login?next=${encodeURIComponent(location.pathname)}`

  const [work, setWork] = useState(undefined) // undefined = 불러오는 중, null = 없음
  const [comments, setComments] = useState([])
  const [error, setError] = useState("")

  // 작품과 댓글을 동시에 불러와요.
  // Promise.all: 두 요청을 "동시에" 보내고 둘 다 끝날 때까지 기다려요. (하나씩 차례로 보내는 것보다 빠름)
  // user를 의존성에 넣은 이유: 로그인/로그아웃하면 "내가 좋아요 눌렀는지"가 달라져서 다시 불러와야 해요.
  useEffect(() => {
    let ignore = false
    Promise.all([getPublicWork(workId), listComments(workId)])
      .then(([w, c]) => {
        if (ignore) return
        setWork(w)
        setComments(c)
      })
      .catch((err) => {
        if (ignore) return
        if (err.status === 404) setWork(null)
        else setError("작품을 불러오지 못했어요.")
      })
    return () => {
      ignore = true
    }
  }, [workId, user])

  return (
    <div className="page">
      <header className="page-header">
        <BackButton to="/community" label="커뮤니티 목록으로" />
      </header>

      {error && <p className="empty">{error}</p>}
      {!error && work === undefined && <p className="empty">불러오는 중…</p>}
      {work === null && <p className="empty">공개된 작품이 아니거나 삭제된 작품이에요.</p>}

      {work && (
        <article className="cw">
          {/* 내 작품을 비공개 상태에서 미리 보는 경우 안내 */}
          {!work.isPublic && <p className="cw-private">🔒 비공개 작품이에요. 나만 볼 수 있어요.</p>}

          <h1 className="cw-title">{work.title}</h1>
          <div className="cw-meta">
            <span>{work.ownerNickname}</span>
            <span>{MODE_LABELS[work.mode] ?? work.mode}</span>
            {work.authors?.length > 0 && <span>함께 쓴 사람: {work.authors.join(", ")}</span>}
            {work.publishedAt && <span>{formatDate(work.publishedAt)}</span>}
          </div>

          {work.prompt && <PromptCard prompt={work.prompt} />}

          <div className="cw-body">{work.body}</div>

          {work.isPublic && (
            <LikeButton work={work} user={user} loginHref={loginHref} onChange={(patch) => setWork((w) => ({ ...w, ...patch }))} />
          )}

          {work.isPublic && (
            <Comments
              workId={workId}
              workOwnerId={work.ownerId}
              comments={comments}
              setComments={setComments}
              user={user}
              loginHref={loginHref}
            />
          )}
        </article>
      )}
    </div>
  )
}

// ---------- 좋아요 ----------
const LikeButton = ({ work, user, loginHref, onChange }) => {
  const [busy, setBusy] = useState(false)

  if (!user) {
    return (
      <div className="cw-like">
        <Link to={loginHref} className="btn">
          ♡ {work.likeCount} · 로그인하고 좋아요
        </Link>
      </div>
    )
  }

  const toggle = async () => {
    setBusy(true)
    try {
      // 서버가 돌려준 진짜 좋아요 수로 갱신 (다른 사람이 동시에 눌렀어도 정확하게)
      const result = work.likedByMe ? await unlikeWork(work.id) : await likeWork(work.id)
      onChange({ likedByMe: result.liked, likeCount: result.likeCount })
    } catch (err) {
      console.error(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cw-like">
      <button type="button" className={`btn${work.likedByMe ? " primary" : ""}`} onClick={toggle} disabled={busy} aria-pressed={work.likedByMe}>
        {work.likedByMe ? "♥" : "♡"} 좋아요 {work.likeCount}
      </button>
    </div>
  )
}

// ---------- 댓글 ----------
const Comments = ({ workId, workOwnerId, comments, setComments, user, loginHref }) => {
  const [body, setBody] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    setError("")
    try {
      const created = await createComment(workId, body)
      setComments((list) => [...list, created]) // 새 댓글을 맨 아래에 붙여요
      setBody("")
    } catch (err) {
      console.error(err)
      setError("댓글을 달지 못했어요.")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("댓글을 삭제할까요?")) return
    try {
      await deleteComment(id)
      setComments((list) => list.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
      setError("삭제하지 못했어요.")
    }
  }

  return (
    <section className="cw-comments">
      <h2 className="cw-comments-title">댓글 {comments.length}</h2>

      <ul className="cw-comment-list">
        {comments.map((c) => (
          <li key={c.id} className="cw-comment">
            <div className="cw-comment-head">
              <b>{c.nickname}</b>
              {c.userId === workOwnerId && <span className="badge">작가</span>}
              <span>{formatDate(c.createdAt)}</span>
              {/* 지울 수 있는 사람: 댓글 쓴 사람, 또는 작품 주인 (서버도 똑같이 검사해요) */}
              {user && (user.id === c.userId || user.id === workOwnerId) && (
                <button type="button" className="cw-comment-del" onClick={() => handleDelete(c.id)}>
                  삭제
                </button>
              )}
            </div>
            <p className="cw-comment-body">{c.body}</p>
          </li>
        ))}
      </ul>

      {user ? (
        <form className="cw-comment-form" onSubmit={handleSubmit}>
          <textarea
            className="cw-comment-input"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={COMMENT_MAX}
            placeholder="감상을 남겨주세요"
          />
          <div className="cw-comment-foot">
            {error && <span className="cw-error">{error}</span>}
            <span className="cw-count">
              {body.length} / {COMMENT_MAX}
            </span>
            <button type="submit" className="btn primary" disabled={busy || !body.trim()}>
              댓글 달기
            </button>
          </div>
        </form>
      ) : (
        <p className="cw-login">
          <Link to={loginHref}>로그인</Link>하면 댓글을 남길 수 있어요.
        </p>
      )}
    </section>
  )
}

export default CommunityWork

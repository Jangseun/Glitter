import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import PromptCard from "../components/PromptCard"
import { deleteWork, getWork, updateWork } from "../services/worksApi"
import { MODE_LABELS, formatDate } from "../utils/format"
import "./WorkDetail.css"

// 작품 상세 페이지 (/works/:workId)
// "수정" 버튼을 누르면 같은 화면에서 제목/본문이 입력칸으로 바뀌어요. (별도 수정 페이지 없음)
const WorkDetail = () => {
  // URL의 :workId 부분을 꺼내요. 예: /works/abc123 → workId = "abc123"
  const { workId } = useParams()
  const navigate = useNavigate()

  // undefined = 불러오는 중, null = 해당 ID의 작품이 없음, 객체 = 불러온 작품
  const [work, setWork] = useState(undefined)
  // 서버 오류 등으로 불러오기/삭제에 실패했을 때 보여줄 메시지
  const [error, setError] = useState("")

  // ---- 수정 모드 ----
  // isEditing: 지금 수정 중인지
  // draftTitle/draftBody: 입력칸에 쓰고 있는 값. "저장"을 누르기 전까지는 work에 반영하지 않아요.
  //   → "취소"하면 이 값만 버리면 되니까 원래 작품 내용이 그대로 남아요.
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [draftBody, setDraftBody] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // workId가 바뀔 때마다(다른 작품으로 이동) 다시 불러와요.
  // ignore 플래그의 이유는 Works.jsx의 useEffect 주석 참고
  useEffect(() => {
    let ignore = false
    getWork(workId)
      .then((result) => {
        if (!ignore) setWork(result)
      })
      .catch((err) => {
        console.error(err)
        if (!ignore) setError("작품을 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요.")
      })
    return () => {
      ignore = true
    }
  }, [workId])

  const handleDelete = async () => {
    if (!window.confirm("이 작품을 삭제할까요? 되돌릴 수 없어요.")) return
    try {
      await deleteWork(workId)
    } catch (err) {
      console.error(err)
      setError("삭제하지 못했어요. 잠시 후 다시 시도해주세요.")
      return
    }
    // replace: 뒤로 가기를 눌렀을 때 삭제된 작품 페이지로 돌아오지 않게 기록을 교체해요.
    navigate("/works", { replace: true })
  }

  // 수정 시작: 지금 작품 내용을 입력칸에 복사해서 넣어줘요.
  const startEdit = () => {
    setDraftTitle(work.title)
    setDraftBody(work.body)
    setEditError("")
    setIsEditing(true)
  }

  const hasChanges = isEditing && (draftTitle !== work.title || draftBody !== work.body)

  const cancelEdit = () => {
    if (hasChanges && !window.confirm("고친 내용이 사라져요. 수정을 취소할까요?")) return
    setIsEditing(false)
  }

  const saveEdit = async () => {
    const title = draftTitle.trim()
    if (!title) {
      setEditError("제목을 입력해주세요.")
      return
    }
    if (!draftBody.trim()) {
      setEditError("본문을 비울 수는 없어요.")
      return
    }
    // 바뀐 게 없으면 서버에 보낼 필요 없이 그냥 수정 모드만 끝내요.
    if (!hasChanges) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setEditError("")
    try {
      // 서버가 돌려준 "수정된 작품"으로 화면을 갱신해요. (updatedAt도 서버 값으로 바뀜)
      const updated = await updateWork(workId, { title, body: draftBody })
      setWork(updated)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      // 실패해도 수정 모드와 입력 내용은 그대로 둬서, 쓴 내용을 잃지 않고 다시 저장할 수 있게 해요.
      setEditError("저장하지 못했어요. 잠시 후 다시 시도해주세요.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/works" className="page-back">
          ← 내 작품
        </Link>
      </header>

      {error && <p className="empty">{error}</p>}

      {!error && work === undefined && <p className="empty">불러오는 중…</p>}

      {work === null && (
        <div className="empty">
          <p>작품을 찾을 수 없어요.</p>
          <Link to="/works" className="btn">
            목록으로
          </Link>
        </div>
      )}

      {work && (
        <article className="wd">
          {isEditing ? (
            <input
              className="wd-title wd-title-input"
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              maxLength={100}
              placeholder="제목"
              autoFocus
            />
          ) : (
            <h1 className="wd-title">{work.title}</h1>
          )}

          <div className="wd-meta">
            <span>{MODE_LABELS[work.mode] ?? work.mode}</span>
            {/* 아직 로그인 기능이 없어서 작성자가 비어있으면 "나"로 보여줘요 */}
            <span>{work.authors?.length ? work.authors.join(", ") : "나"}</span>
            <span>{formatDate(work.createdAt)}</span>
            {work.updatedAt && <span>{formatDate(work.updatedAt)} 수정</span>}
          </div>

          {work.prompt && <PromptCard prompt={work.prompt} body={isEditing ? draftBody : undefined} />}

          {isEditing ? (
            // 일반 controlled textarea라 한글 입력에 문제없어요. (WritingSolo.jsx의 textarea 주석 참고)
            <textarea
              className="wd-body wd-body-input"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
            />
          ) : (
            // pre-wrap: 작성할 때 넣은 줄바꿈/띄어쓰기를 그대로 보여줘요
            <div className="wd-body">{work.body}</div>
          )}

          <div className="wd-actions">
            {isEditing ? (
              <>
                {editError && <span className="wd-error">{editError}</span>}
                <button type="button" className="btn" onClick={cancelEdit} disabled={isSaving}>
                  취소
                </button>
                <button type="button" className="btn primary" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? "저장 중…" : "저장"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn" onClick={handleDelete}>
                  삭제
                </button>
                <button type="button" className="btn primary" onClick={startEdit}>
                  수정
                </button>
              </>
            )}
          </div>
        </article>
      )}
    </div>
  )
}

export default WorkDetail

import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import PromptCard from "../components/PromptCard"
import { deleteWork, getWork } from "../services/worksApi"
import { MODE_LABELS, formatDate } from "../utils/format"
import "./WorkDetail.css"

// 작품 상세 페이지 (/works/:workId)
const WorkDetail = () => {
  // URL의 :workId 부분을 꺼내요. 예: /works/abc123 → workId = "abc123"
  const { workId } = useParams()
  const navigate = useNavigate()

  // undefined = 불러오는 중, null = 해당 ID의 작품이 없음, 객체 = 불러온 작품
  const [work, setWork] = useState(undefined)

  // workId가 바뀔 때마다(다른 작품으로 이동) 다시 불러와요.
  // ignore 플래그의 이유는 Works.jsx의 useEffect 주석 참고
  useEffect(() => {
    let ignore = false
    getWork(workId).then((result) => {
      if (!ignore) setWork(result)
    })
    return () => {
      ignore = true
    }
  }, [workId])

  const handleDelete = async () => {
    if (!window.confirm("이 작품을 삭제할까요? 되돌릴 수 없어요.")) return
    await deleteWork(workId)
    // replace: 뒤로 가기를 눌렀을 때 삭제된 작품 페이지로 돌아오지 않게 기록을 교체해요.
    navigate("/works", { replace: true })
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/works" className="page-back">
          ← 내 작품
        </Link>
      </header>

      {work === undefined && <p className="empty">불러오는 중…</p>}

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
          <h1 className="wd-title">{work.title}</h1>
          <div className="wd-meta">
            <span>{MODE_LABELS[work.mode] ?? work.mode}</span>
            {/* 아직 로그인 기능이 없어서 작성자가 비어있으면 "나"로 보여줘요 */}
            <span>{work.authors?.length ? work.authors.join(", ") : "나"}</span>
            <span>{formatDate(work.createdAt)}</span>
          </div>

          {work.prompt && <PromptCard prompt={work.prompt} />}

          {/* pre-wrap: 작성할 때 넣은 줄바꿈/띄어쓰기를 그대로 보여줘요 */}
          <div className="wd-body">{work.body}</div>

          <div className="wd-actions">
            <button type="button" className="btn" onClick={handleDelete}>
              삭제
            </button>
          </div>
        </article>
      )}
    </div>
  )
}

export default WorkDetail

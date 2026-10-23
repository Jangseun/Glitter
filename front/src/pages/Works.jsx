import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { listWorks } from "../services/worksApi"
import { MODE_LABELS, formatDate } from "../utils/format"
import "./Works.css"

// 저장한 작품 목록 페이지 (/works)
const Works = () => {
  // null = 아직 불러오는 중, [] = 불러왔는데 작품이 없음. 두 상태를 구분하려고 null로 시작해요.
  const [works, setWorks] = useState(null)
  // 서버가 꺼져 있거나 네트워크 오류로 목록을 못 불러왔을 때 true
  const [loadError, setLoadError] = useState(false)

  // 페이지에 들어오면 작품 목록을 한 번 불러와요.
  // useEffect의 콜백 자체는 async로 만들 수 없어서(cleanup 함수를 돌려줘야 하므로)
  // 안에서 Promise의 .then으로 처리해요.
  // ignore 플래그: 불러오는 도중 페이지를 떠나면, 늦게 도착한 결과로 state를 바꾸지 않게 막아요.
  // (서버 응답은 시간이 걸리니까, 그 사이 다른 페이지로 이동하는 경우를 대비하는 패턴이에요)
  useEffect(() => {
    let ignore = false
    listWorks()
      .then((result) => {
        if (!ignore) setWorks(result)
      })
      .catch((err) => {
        console.error(err)
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="page-back">
          ← 홈
        </Link>
        <h1 className="page-title">내 작품</h1>
      </header>

      {loadError && <p className="empty">작품을 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요.</p>}

      {!loadError && works === null && <p className="empty">불러오는 중…</p>}

      {works?.length === 0 && (
        <div className="empty">
          <p>아직 완성한 이야기가 없어요.</p>
          <Link to="/writing/solo" className="btn primary">
            첫 이야기 쓰러 가기
          </Link>
        </div>
      )}

      {works?.length > 0 && (
        <ul className="works">
          {works.map((work) => (
            <li key={work.id}>
              <Link to={`/works/${work.id}`} className="work-card">
                <h2 className="work-title">{work.title}</h2>
                {/* 본문 앞부분 미리보기. 여러 줄이어도 CSS에서 3줄까지만 보여줘요. */}
                <p className="work-excerpt">{work.body}</p>
                <div className="work-meta">
                  <span>{MODE_LABELS[work.mode] ?? work.mode}</span>
                  {work.prompt?.genre && <span>{work.prompt.genre}</span>}
                  <span>{formatDate(work.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Works

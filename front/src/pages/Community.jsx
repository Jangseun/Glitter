import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PAGE_SIZE, listPublicWorks } from "../services/communityApi"
import { MODE_LABELS, formatDate } from "../utils/format"
import "./Community.css"

// 커뮤니티 (/community) — 사람들이 공개한 작품 목록. 로그인 없이도 볼 수 있어요.
// 정렬은 주소(?sort=popular)에 저장해서, 새로고침/뒤로 가기를 해도 유지돼요.
const Community = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get("sort") === "popular" ? "popular" : "latest"

  const [works, setWorks] = useState(null) // null = 불러오는 중
  const [hasMore, setHasMore] = useState(false) // 더 불러올 작품이 있는지
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")

  // 정렬이 바뀌면 첫 페이지부터 다시 불러와요.
  // ignore: 정렬을 빠르게 바꿀 때 늦게 도착한 이전 응답이 목록을 덮어쓰지 않게 (TextPicker와 같은 패턴)
  useEffect(() => {
    let ignore = false
    listPublicWorks({ sort })
      .then((result) => {
        if (ignore) return
        setWorks(result)
        // 한 페이지를 꽉 채워서 왔으면 뒤에 더 있을 수 있어요
        setHasMore(result.length === PAGE_SIZE)
        setError("")
      })
      .catch((err) => {
        console.error(err)
        if (!ignore) setError("작품을 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요.")
      })
    return () => {
      ignore = true
    }
  }, [sort])

  // "더 보기": 지금까지 받은 개수만큼 건너뛰고 다음 페이지를 받아서 뒤에 이어 붙여요.
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const next = await listPublicWorks({ sort, offset: works.length })
      setWorks((list) => [...list, ...next])
      setHasMore(next.length === PAGE_SIZE)
    } catch (err) {
      console.error(err)
      setError("더 불러오지 못했어요.")
    } finally {
      setLoadingMore(false)
    }
  }

  const changeSort = (value) => {
    setWorks(null)
    setSearchParams(value === "popular" ? { sort: "popular" } : {})
  }

  return (
    <div className="page">
      <header className="page-header cm-header">
        <h1 className="page-title">커뮤니티</h1>
        <div className="seg">
          <button type="button" className={`seg-btn${sort === "latest" ? " on" : ""}`} onClick={() => changeSort("latest")}>
            최신순
          </button>
          <button type="button" className={`seg-btn${sort === "popular" ? " on" : ""}`} onClick={() => changeSort("popular")}>
            인기순
          </button>
        </div>
      </header>

      {error && <p className="cm-error">{error}</p>}
      {!error && works === null && <p className="empty">불러오는 중…</p>}
      {works?.length === 0 && (
        <div className="empty">
          <p>아직 공개된 작품이 없어요.</p>
          <p className="cm-hint">내 작품에서 "공개하기"를 누르면 여기에 올라와요.</p>
        </div>
      )}

      {works?.length > 0 && (
        <>
          <ul className="cm-list">
            {works.map((w) => (
              <li key={w.id}>
                <Link to={`/community/${w.id}`} className="cm-card">
                  <div className="cm-card-top">
                    <span className="badge">{MODE_LABELS[w.mode] ?? w.mode}</span>
                    {w.prompt?.genre && <span className="badge">{w.prompt.genre}</span>}
                  </div>
                  <h2 className="cm-title">{w.title}</h2>
                  <p className="cm-excerpt">{w.excerpt}</p>
                  <div className="cm-meta">
                    <span>{w.ownerNickname}</span>
                    {w.publishedAt && <span>{formatDate(w.publishedAt)}</span>}
                    <span className="cm-counts">
                      좋아요 {w.likeCount} · 댓글 {w.commentCount}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="cm-more">
              <button type="button" className="btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "불러오는 중…" : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Community

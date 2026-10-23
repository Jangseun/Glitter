import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { CATEGORY_LABEL, TEXT_CATEGORIES } from "../data/textCategories"
import { deleteText, listTexts, textSource } from "../services/textsApi"
import "./TextPicker.css"

// 타자 연습 글 고르기 화면.
// 위쪽 분류(전체/시/명언/…)를 고르면 그 분류의 글 목록이 나오고, 글을 누르면 그 글로 연습을 시작해요.
//
// category:         지금 고른 분류 ("all" 또는 "poem" 등)
// onCategoryChange: 분류 버튼을 눌렀을 때
// onPick:           글을 골랐을 때 (API 글 객체를 넘겨줘요)
const TextPicker = ({ category, onCategoryChange, onPick }) => {
  const { user } = useAuth()
  const [texts, setTexts] = useState(null) // null = 불러오는 중
  const [error, setError] = useState("")

  // 분류가 바뀔 때마다 그 분류의 글 목록을 다시 불러와요.
  // ignore 플래그: 분류를 빠르게 바꾸면 이전 요청의 응답이 늦게 도착해서
  // 지금 분류의 목록을 덮어쓸 수 있어요. 그래서 "이미 지난 요청"의 결과는 버려요.
  useEffect(() => {
    let ignore = false
    listTexts(category)
      .then((result) => {
        if (!ignore) {
          setTexts(result)
          setError("")
        }
      })
      .catch((err) => {
        console.error(err)
        if (!ignore) setError("글을 불러오지 못했어요. 서버가 켜져 있는지 확인해주세요.")
      })
    return () => {
      ignore = true
    }
  }, [category])

  const changeCategory = (key) => {
    setTexts(null) // 새 목록이 올 때까지 "불러오는 중"으로
    onCategoryChange(key)
  }

  // 불러온 목록 중에서 무작위로 하나 (서버에 다시 물어볼 필요 없음)
  const pickRandom = () => {
    if (texts?.length) onPick(texts[Math.floor(Math.random() * texts.length)])
  }

  const handleDelete = async (text) => {
    if (!window.confirm("이 글을 삭제할까요?")) return
    try {
      await deleteText(text.id)
      setTexts((list) => list.filter((t) => t.id !== text.id))
    } catch (err) {
      console.error(err)
      setError("삭제하지 못했어요.")
    }
  }

  const tabs = [{ key: "all", label: "전체" }, ...TEXT_CATEGORIES]

  return (
    <div className="picker-page">
      <div className="text-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={category === tab.key}
            className={`text-tab${category === tab.key ? " on" : ""}`}
            onClick={() => changeCategory(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="text-actions">
        <button type="button" className="btn primary" onClick={pickRandom} disabled={!texts?.length}>
          🎲 아무 글이나 치기
        </button>
        {/* 등록은 로그인이 필요해요. 로그인 안 했으면 로그인 후 등록 화면으로 오게 */}
        <Link
          to={user ? `/typing/texts/new?category=${category === "all" ? "" : category}` : "/login?next=/typing/texts/new"}
          className="btn"
        >
          ✏️ 좋은 글귀 등록하기
        </Link>
        {texts && <span className="text-count">{texts.length}개의 글</span>}
      </div>

      {error && <p className="text-error">{error}</p>}
      {!error && texts === null && <p className="empty">불러오는 중…</p>}
      {texts?.length === 0 && <p className="empty">아직 이 분류에는 글이 없어요. 첫 글을 등록해보세요!</p>}

      {texts?.length > 0 && (
        <ul className="text-list">
          {texts.map((t) => (
            <li key={t.id}>
              <button type="button" className="text-card" onClick={() => onPick(t)}>
                <span className="text-card-top">
                  {category === "all" && <span className="badge">{CATEGORY_LABEL[t.category]}</span>}
                  <span className="text-len">{t.content.length}자</span>
                </span>
                <span className="text-content">{t.content}</span>
                <span className="text-meta">
                  {textSource(t) || "작자 미상"}
                  {t.uploader && <span> · {t.uploader}님이 등록</span>}
                </span>
              </button>
              {/* 내가 등록한 글만 삭제 버튼 (카드 버튼 안에 버튼을 넣을 수 없어서 바깥에 겹쳐 둬요) */}
              {user && t.userId === user.id && (
                <button type="button" className="text-delete" onClick={() => handleDelete(t)} aria-label="삭제">
                  삭제
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TextPicker

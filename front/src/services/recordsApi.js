// 타자 기록 API (backend/app/routers/typing_records.py) — 전부 로그인 필요
import { request } from "./http"

// 한 판 끝났을 때 기록 저장
// mode: "solo" | "battle", stats: utils/typingStats.js의 calcTypingStats 결과
export const saveRecord = ({ mode, textId = null, category = null, stats, charCount }) =>
  request("/api/typing-records", {
    method: "POST",
    body: {
      mode,
      textId,
      category,
      // 서버가 받는 범위(0~3000타)를 넘으면 저장이 거절되니 잘라서 보내요
      // (사람은 넘기 어렵지만, 자동 입력 프로그램 등으로 비정상적으로 빠르게 치면 넘을 수 있어요)
      speed: Math.min(stats.speed, 3000),
      accuracy: stats.accuracy,
      typoCount: stats.typoCount,
      seconds: Math.round(stats.seconds * 10) / 10,
      charCount,
    },
  })

// 최근 기록 (최신순)
export const listRecords = (limit = 50) => request(`/api/typing-records?limit=${limit}`)

// 요약 { totalCount, totalChars, totalSeconds, bestSpeed, recentSpeed, recentAccuracy }
export const getSummary = () => request("/api/typing-records/summary")

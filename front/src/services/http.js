// 백엔드 API를 부를 때 공통으로 쓰는 fetch 도우미.
//
// API 주소:
// - 개발 중: 비워두면 "/api/..." 상대 경로로 요청 → vite.config.js의 프록시가 localhost:8000으로 전달
// - 배포 등으로 백엔드 주소가 따로 있으면 front/.env 에 VITE_API_URL=https://... 로 지정
//   (Vite는 VITE_ 로 시작하는 환경변수만 프론트 코드에 노출해줘요)
export const API_BASE = import.meta.env.VITE_API_URL ?? ""

// WebSocket 주소 만들기. http → ws, https → wss 로 바꿔줘요.
// API_BASE가 비어있으면(개발 중) 지금 페이지 주소(localhost:5173) 기준 → Vite 프록시가 백엔드로 전달
// 예) wsUrl("/api/ws/rooms/AB3CD") → "ws://localhost:5173/api/ws/rooms/AB3CD"
export const wsUrl = (path) => {
  const base = API_BASE || window.location.origin
  return base.replace(/^http/, "ws") + path
}

// 서버가 에러 응답을 줬을 때 던지는 에러. status로 404 같은 경우를 구분할 수 있어요.
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---------- 로그인 토큰 보관 ----------
// 로그인하면 서버가 준 JWT 토큰을 localStorage에 저장해두고, 요청마다 헤더에 붙여 보내요.
// localStorage라서 새로고침하거나 브라우저를 껐다 켜도 로그인이 유지돼요. (토큰 만료 전까지)
//
// 참고) localStorage는 페이지의 자바스크립트가 읽을 수 있어서, 사이트에 악성 스크립트가 끼어들면(XSS)
// 토큰을 훔쳐갈 수 있어요. 더 안전한 방법(httpOnly 쿠키)도 있지만 설정이 복잡해서,
// 졸업작품 규모에서는 이 방식을 쓰고 React가 기본으로 해주는 XSS 방어에 맡겨요.
const TOKEN_KEY = "glitter:token"

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 저장소 접근이 막힌 환경이면 이번 접속 동안만 메모리에서 쓰게 돼요 (새로고침하면 로그아웃)
  }
}

// fetch를 감싼 함수.
// 1) body에 객체를 넘기면 JSON 문자열로 바꾸고 Content-Type 헤더를 붙여줘요.
// 2) 로그인 토큰이 있으면 "Authorization: Bearer <토큰>" 헤더를 자동으로 붙여요.
//    → 각 API 함수에서 토큰을 신경 쓸 필요가 없어요.
// 3) fetch는 404/500 같은 에러 응답에도 throw하지 않아서(네트워크 자체가 끊긴 경우만 throw),
//    res.ok를 직접 확인해서 에러면 ApiError를 던져요. → 호출하는 쪽은 try/catch 하나로 처리 가능
// 4) 성공하면 JSON을 파싱해서 돌려줘요. (204 No Content처럼 본문이 없으면 null)
export const request = async (path, { method = "GET", body } = {}) => {
  const headers = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    // FastAPI는 에러 메시지를 { "detail": "..." } 형태로 보내줘요.
    // 입력값 검사 실패(422)일 땐 detail이 배열이라 첫 번째 항목의 메시지를 꺼내요.
    let message = `요청 실패 (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === "string") message = data.detail
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) message = data.detail[0].msg
    } catch {
      // 에러 본문이 JSON이 아니면(프록시 에러 등) 기본 메시지 사용
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return null
  return res.json()
}

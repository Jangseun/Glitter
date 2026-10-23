// 백엔드 API를 부를 때 공통으로 쓰는 fetch 도우미.
//
// API 주소:
// - 개발 중: 비워두면 "/api/..." 상대 경로로 요청 → vite.config.js의 프록시가 localhost:8000으로 전달
// - 배포 등으로 백엔드 주소가 따로 있으면 front/.env 에 VITE_API_URL=https://... 로 지정
//   (Vite는 VITE_ 로 시작하는 환경변수만 프론트 코드에 노출해줘요)
export const API_BASE = import.meta.env.VITE_API_URL ?? ""

// 서버가 에러 응답을 줬을 때 던지는 에러. status로 404 같은 경우를 구분할 수 있어요.
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// fetch를 감싼 함수.
// 1) body에 객체를 넘기면 JSON 문자열로 바꾸고 Content-Type 헤더를 붙여줘요.
// 2) fetch는 404/500 같은 에러 응답에도 throw하지 않아서(네트워크 자체가 끊긴 경우만 throw),
//    res.ok를 직접 확인해서 에러면 ApiError를 던져요. → 호출하는 쪽은 try/catch 하나로 처리 가능
// 3) 성공하면 JSON을 파싱해서 돌려줘요. (204 No Content처럼 본문이 없으면 null)
export const request = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    // FastAPI는 에러 메시지를 { "detail": "..." } 형태로 보내줘요.
    let message = `요청 실패 (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === "string") message = data.detail
    } catch {
      // 에러 본문이 JSON이 아니면(프록시 에러 등) 기본 메시지 사용
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return null
  return res.json()
}

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 서버 프록시.
    // 프론트(localhost:5173)에서 /api 로 시작하는 요청을 보내면, Vite가 대신 백엔드(localhost:8000)로 전달해줘요.
    // 브라우저 입장에서는 같은 주소로 요청하는 거라 CORS 문제가 생기지 않고,
    // 프론트 코드에는 fetch("/api/works")처럼 경로만 쓰면 돼요.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        ws: true, // WebSocket(/api/ws/...)도 같이 전달 (타자 대결/이어쓰기용)
      },
    },
  },
})

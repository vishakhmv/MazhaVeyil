import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The engine (Vishakh) answers /api/engine/* and /api/v1/* on :8081; Kishan's community service answers /api/community/* on :8082.
// `npm run demo` at the repo root serves the build with its own router, so these proxies are only for `npm run dev` and `vite preview`.
const proxy = {
  '/api/community': 'http://localhost:8082',
  '/api': 'http://localhost:8081',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173, proxy, fs: { allow: ['..'] } }, // fs.allow: the app imports ../contracts (shared strings and the KSEB maths)
  preview: { host: true, port: 8080, proxy },
})

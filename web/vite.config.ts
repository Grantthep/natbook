import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Same-origin /api in dev and prod (Vercel rewrite), so the login cookie just works.
  server: { proxy: { '/api': 'http://localhost:8000' } },
})

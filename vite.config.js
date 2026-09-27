import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base = path ที่เว็บถูกเปิด
// - npm run dev และ Vercel (baanbrew-dashboard.vercel.app/)  → '/'
// - build อื่น ๆ เช่น GitHub Pages (…github.io/Baanbrew-dashboard/) → '/Baanbrew-dashboard/'
// Vercel ตั้งตัวแปร VERCEL=1 ให้เองตอน build
export default defineConfig(({ command }) => ({
  base: command === 'build' && !process.env.VERCEL ? '/Baanbrew-dashboard/' : '/',
  plugins: [react(), tailwindcss()],
}))

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
// 字体自托管（@fontsource latin 子集，随包打包，不依赖 Google Fonts CDN）
import '@fontsource/lora/latin-400.css'
import '@fontsource/lora/latin-400-italic.css'
import '@fontsource/lora/latin-500.css'
import '@fontsource/lora/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-300.css'
import '@fontsource/plus-jakarta-sans/latin-300-italic.css'
import '@fontsource/plus-jakarta-sans/latin-400.css'
import '@fontsource/plus-jakarta-sans/latin-400-italic.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/manrope/latin-300.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import App from './App.jsx'

// PWA:生产环境注册 Service Worker(仅网页版;Capacitor 原生包不注册)
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// 主题类在首帧前就确定下来:避免深色模式下先按浅色变量绘制一帧、
// 再由 useEffect 补 .dark 导致的整页不重算(深色失效)。
{
  const saved = localStorage.getItem('liubai-theme')
  const prefersDark =
    saved === 'dark' || saved === 'light'
      ? saved === 'dark'
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', prefersDark)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
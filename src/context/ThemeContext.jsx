import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

// 全局主题状态:浅色/深色 + 跟随系统 + 持久化 + 切换过渡。
// 收敛自原 hooks/useDarkMode.js(此前 App/Home/Me 各自实例化,存在状态不同步隐患)。

const ThemeContext = createContext(null)

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false

// 用户是否手动选择过主题(手动选择后不再跟随系统)
const hasManualChoice = () => {
  const saved = localStorage.getItem('liubai-theme')
  return saved === 'dark' || saved === 'light'
}

export function ThemeProvider({ children }) {
  // 初始值:手动选择优先,否则跟随系统
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('liubai-theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
    return systemPrefersDark()
  })

  // 首次挂载时 <html> 上的 dark 类已由 index.html / main.jsx 设好,
  // 这里只负责后续切换:同步类名 + 挂过渡类 + 原生状态栏。
  const mounted = useRef(false)

  useEffect(() => {
    const root = document.documentElement

    if (!mounted.current) {
      // 首帧:只同步类名,不加过渡(避免首屏闪一下)
      mounted.current = true
      root.classList.toggle('dark', isDark)
      return
    }

    // 切换瞬间挂一个临时过渡类,让背景/文字/边框颜色柔和过渡(380ms 后移除)
    root.classList.add('theme-transition')
    const t = setTimeout(() => root.classList.remove('theme-transition'), 380)

    root.classList.toggle('dark', isDark)
    if (Capacitor.isNativePlatform()) {
      StatusBar.setBackgroundColor({ color: isDark ? '#1a1c18' : '#fcf9f6' })
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
    }
    return () => clearTimeout(t)
  }, [isDark])

  // 用户从未手动选择时,跟随系统主题变化
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      if (hasManualChoice()) return
      setIsDark(e.matches)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 手动切换(持久化选择,之后不再跟随系统)
  const toggleDark = useCallback((v) => {
    localStorage.setItem('liubai-theme', v ? 'dark' : 'light')
    setIsDark(v)
  }, [])

  return <ThemeContext.Provider value={{ isDark, toggleDark }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 必须在 <ThemeProvider> 内使用')
  return ctx
}

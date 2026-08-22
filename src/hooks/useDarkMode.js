import { useState, useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

// 系统深色模式偏好
const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false

// 用户是否手动选择过主题（手动选择后不再跟随系统）
const hasManualChoice = () => {
  const saved = localStorage.getItem('liubai-theme')
  return saved === 'dark' || saved === 'light'
}

export function useDarkMode() {
  // 初始值：手动选择优先，否则跟随系统
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('liubai-theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
    return systemPrefersDark()
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      if (Capacitor.isNativePlatform()) {
        StatusBar.setBackgroundColor({ color: '#1a1c18' })
        StatusBar.setStyle({ style: Style.Dark })
      }
    } else {
      root.classList.remove('dark')
      if (Capacitor.isNativePlatform()) {
        StatusBar.setBackgroundColor({ color: '#fcf9f6' })
        StatusBar.setStyle({ style: Style.Light })
      }
    }
  }, [isDark])

  // 用户从未手动选择时，跟随系统主题变化
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

  // 手动切换（持久化选择，之后不再跟随系统）
  const toggleDark = (v) => {
    localStorage.setItem('liubai-theme', v ? 'dark' : 'light')
    setIsDark(v)
  }

  return [isDark, toggleDark]
}

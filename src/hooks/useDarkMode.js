import { useState, useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('liubai-theme') === 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('liubai-theme', 'dark')
      if (Capacitor.isNativePlatform()) {
        StatusBar.setBackgroundColor({ color: '#1a1c18' })
        StatusBar.setStyle({ style: Style.Dark })
      }
    } else {
      root.classList.remove('dark')
      localStorage.setItem('liubai-theme', 'light')
      if (Capacitor.isNativePlatform()) {
        StatusBar.setBackgroundColor({ color: '#fcf9f6' })
        StatusBar.setStyle({ style: Style.Light })
      }
    }
  }, [isDark])

  return [isDark, setIsDark]
}
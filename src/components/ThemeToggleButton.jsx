// 右上角深浅色模式切换按钮(与首页一致;图标表示点击后进入的模式)
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggleButton() {
  const { isDark, toggleDark } = useTheme()
  return (
    <button
      onClick={() => toggleDark(!isDark)}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low border border-outline-variant/10 text-on-surface-variant transition-all duration-300 hover:text-primary active:scale-90"
    >
      <span className="material-symbols-outlined text-lg">{isDark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  )
}

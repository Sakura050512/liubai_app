import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', icon: 'home_max', label: '首页' },
  { path: '/journal', icon: 'auto_stories', label: '日记' },
  { path: '/talk', icon: 'chat_bubble_outline', label: '对话' },
  { path: '/me', icon: 'person_outline', label: '我的' },
]

export default function BottomNav() {
  const location = useLocation()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-20 px-4 bg-surface"
      style={{
        boxShadow: '0 -1px 0 rgba(49,51,47,0.06), 0 -4px 32px rgba(49,51,47,0.04)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center px-5 py-1 rounded-full transition-all duration-300 active:scale-95 ${
              isActive
                ? 'bg-primary-container text-primary'
                : 'text-outline hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined mb-1"
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }
                  : {}
              }
            >
              {item.icon}
            </span>
            <span className="font-headline text-[11px] font-medium tracking-[0.1em] uppercase">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
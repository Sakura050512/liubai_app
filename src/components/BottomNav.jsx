import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', icon: 'home_max', label: '首页' },
  { path: '/journal', icon: 'auto_stories', label: '日记' },
  { path: '/talk', icon: 'chat_bubble_outline', label: '聊聊' },
  { path: '/me', icon: 'person_outline', label: '我的' },
]

export default function BottomNav() {
  const location = useLocation()
  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-2"
      style={{
        height: 'calc(72px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: 'rgba(252,249,246,0.88)',
        boxShadow: '0 -1px 0 rgba(49,51,47,0.06), 0 -8px 32px rgba(49,51,47,0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 ${
              isActive
                ? 'text-primary'
                : 'text-outline hover:text-primary'
            }`}
            style={{ width: 72, height: 56 }}
          >
            {/* active 胶囊背景 */}
            <span
              aria-hidden="true"
              className={`absolute inset-x-2 inset-y-1 rounded-2xl bg-primary-container transition-all duration-300 ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
              style={isActive ? { opacity: 1 } : undefined}
            />
            <span
              className="material-symbols-outlined mb-0.5 relative"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                fontSize: 22,
                transition: 'font-variation-settings 300ms ease',
              }}
            >
              {item.icon}
            </span>
            <span className={`relative font-headline text-[10px] font-medium tracking-[0.08em] transition-colors duration-300 ${isActive ? 'text-primary' : ''}`}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

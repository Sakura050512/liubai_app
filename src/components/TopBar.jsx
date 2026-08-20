import { useNavigate } from 'react-router-dom'

export default function TopBar({ showSearch = false, title = '留白', right = null, left = null, back = false, backTo = null }) {
  const navigate = useNavigate()
  return (
    <header
      className="app-topbar fixed top-0 w-full z-50 flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: 'rgba(252,249,246,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(49,51,47,0.05)',
      }}
    >
      <div className="relative flex items-center justify-between px-6" style={{ height: 64 }}>
        <div className="w-10 flex items-center">
          {left || (back ? (
            <button
              onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
              aria-label="返回"
              className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300"
            >
              arrow_back
            </button>
          ) : (
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300"
            >
              menu
            </span>
          ))}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
          <h1 className="font-headline font-light tracking-[0.3em] text-lg text-primary">
            {title}
          </h1>
        </div>
        <div className="w-10 flex items-center justify-end">
          {right || (showSearch && (
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300"
            >
              search
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

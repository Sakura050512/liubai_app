export default function TopBar({ showSearch = false, title = '留白', right = null, left = null }) {
  return (
    <header
      className="fixed top-0 w-full z-50 bg-surface flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-6 h-16">
        <div className="w-10 flex items-center">
          {left || (
            <span className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300">
              menu
            </span>
          )}
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center"
          style={{ top: 'env(safe-area-inset-top)', bottom: 0 }}
        >
          <h1 className="font-headline font-light tracking-widest text-xl text-primary">
            {title}
          </h1>
        </div>
        <div className="w-10 flex items-center justify-end">
          {right || (showSearch && (
            <span className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300">
              search
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}
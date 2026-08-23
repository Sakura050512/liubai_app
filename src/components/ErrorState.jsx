// 统一的数据加载失败整页态(带图标 + 可选重试)
export default function ErrorState({ message = '出错了,请稍后重试', onRetry }) {
  return (
    <div className="flex flex-col items-center gap-4" style={{ paddingTop: '40vh' }}>
      <span className="material-symbols-outlined text-4xl text-outline">warning</span>
      <p className="text-on-surface-variant text-sm font-light">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-primary text-on-primary transition-all duration-300 active:scale-95"
        >
          重试
        </button>
      )}
    </div>
  )
}

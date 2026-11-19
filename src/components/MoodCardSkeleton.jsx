// 情绪卡片加载骨架：与真实卡片同高的占位，避免"加载中…"文字块造成跳版
export default function MoodCardSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="正在加载今日心情">
      {/* 标题行占位 */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded-full bg-surface-container" />
          <div className="h-4 w-36 rounded-full bg-surface-container" />
        </div>
        <div className="h-7 w-7 rounded-full bg-surface-container" />
      </div>
      {/* 8 个情绪按钮占位（2 行 × 4 列，与真实网格同高） */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[68px] rounded-2xl bg-surface-container-low" />
        ))}
      </div>
    </div>
  )
}

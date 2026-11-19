// 写作区加载骨架：外形与真实输入卡一致（同圆角、同内边距、同样高度），
// 避免加载期间保存按钮上下跳动
export default function WriteAreaSkeleton() {
  return (
    <div
      className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/10 p-6 animate-pulse"
      aria-busy="true"
      aria-label="正在加载今天的日记"
    >
      <div className="h-2.5 w-16 rounded-full bg-surface-container mb-5" />
      <div className="space-y-3">
        <div className="h-4 w-11/12 rounded-full bg-surface-container" />
        <div className="h-4 w-3/4 rounded-full bg-surface-container" />
        <div className="h-4 w-5/6 rounded-full bg-surface-container" />
        {/* 撑出最小高度，与 textarea 的 min-h-[280px] 对齐 */}
        <div className="h-[196px]" />
      </div>
    </div>
  )
}

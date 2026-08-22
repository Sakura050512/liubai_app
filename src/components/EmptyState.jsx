import { Link } from 'react-router-dom'

// 统一的空状态组件：图标 + 标题 + 可选引导按钮
export default function EmptyState({ icon = 'inbox', title, action, actionLabel, to }) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <span className="material-symbols-outlined text-outline-variant text-4xl block mb-3">{icon}</span>
      <p className="text-on-surface-variant text-sm font-light mb-4">{title}</p>
      {action && actionLabel && to && (
        <Link
          to={to}
          className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 shadow-glow-soft"
        >
          <span className="material-symbols-outlined text-sm">{action}</span>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

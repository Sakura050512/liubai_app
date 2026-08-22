// 情绪趋势折线图（纯 SVG，无第三方依赖，纯展示不可交互）
// records: [{ mood, emoji, created_at }] —— 按天聚合，缺失的天不画点
// 时间跨度自适应：从最早记录到今天，最少 3 天、最多 days 天，
// 数据密集时跨度自动缩小，点不会挤在角落。
// 颜色一律用 currentColor + Tailwind 类（不要用 fill="var(--x)"，
// 部分 WebView 中 SVG 属性里的 CSS 变量解析会失效，导致渲染成默认黑色）。
import { localDayKey } from '../lib/date'

// 情绪在纵轴上的顺序（自上而下）
const MOOD_ORDER = ['平静', '愉悦', '低落', '难过', '焦虑', '不安', '烦躁', '疲惫']

const W = 340
const H = 168
const PAD_L = 38 // 左侧情绪名区域
const PAD_R = 10
const PAD_T = 30 // 顶部留出 emoji 标注空间
const PAD_B = 26

export default function MoodTrendChart({ records = [], days = 14 }) {
  const byDay = {}
  records.forEach(r => {
    const k = localDayKey(r.created_at)
    if (!byDay[k]) byDay[k] = r // 一天只取第一条
  })

  // 自适应时间跨度：最早记录到今天，最少 3 天，最多 days 天
  const keys = Object.keys(byDay)
  let span = days
  if (keys.length > 0) {
    const earliest = Math.min(...keys.map(k => new Date(k).getTime()))
    const spanDays = Math.ceil((Date.now() - earliest) / 86400000) + 1
    span = Math.min(Math.max(spanDays, 3), days)
  }

  // 生成时间轴槽位
  const slots = []
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    slots.push({ key: localDayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}` })
  }

  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const stepX = innerW / span
  const yFor = (mood) => {
    const idx = MOOD_ORDER.indexOf(mood)
    return PAD_T + (idx >= 0 ? idx : 4) * (innerH / (MOOD_ORDER.length - 1))
  }

  const points = slots.map((slot, i) => {
    const rec = byDay[slot.key]
    if (!rec) return null
    return { x: PAD_L + (i + 0.5) * stepX, y: yFor(rec.mood), rec }
  }).filter(Boolean)

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-outline text-sm font-light">最近 {days} 天还没有打卡记录</p>
      </div>
    )
  }

  // 日期标签：跨度 ≤ 7 天每天显示，否则显示 5 个均匀分布
  const labelIdx = span <= 7
    ? slots.map((_, i) => i)
    : [...new Set([0, Math.floor(span / 4), Math.floor(span / 2), Math.floor((3 * span) / 4), span - 1])]

  const linePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`近${span}天情绪趋势`}>
      {/* 横向网格线 + 左侧情绪名 */}
      {MOOD_ORDER.map((m, i) => {
        const y = PAD_T + i * (innerH / (MOOD_ORDER.length - 1))
        return (
          <g key={m} className="text-outline">
            <line
              x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
              stroke="currentColor" strokeOpacity="0.18" strokeWidth="1"
            />
            <text
              x={PAD_L - 6} y={y + 3} textAnchor="end"
              fontSize="9" fill="currentColor" fillOpacity="0.85"
            >
              {m}
            </text>
          </g>
        )
      })}

      {/* 趋势折线 */}
      <polyline
        points={linePoints}
        fill="none"
        className="text-primary"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.6"
      />

      {/* 数据点 + emoji */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" className="text-primary" fill="currentColor" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="13">
            {p.rec.emoji}
          </text>
        </g>
      ))}

      {/* X 轴日期标签 */}
      {labelIdx.map(i => (
        <text
          key={i}
          x={PAD_L + (i + 0.5) * stepX}
          y={H - 7}
          textAnchor="middle"
          fontSize="8.5"
          className="text-outline"
          fill="currentColor"
          fillOpacity="0.85"
        >
          {slots[i].label}
        </text>
      ))}
    </svg>
  )
}

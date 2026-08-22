// 本地时区日期工具
// 注意：不要用 date.toISOString().slice(0,10) 取"今天"——那是 UTC 日期，
// 在中国（UTC+8）每天 00:00–08:00 之间会错位到昨天。

// 本地时区"今天"的起止时刻，返回 Date（用于 toISOString() 传给 Supabase 比较 timestamptz）
export function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

// 本地日期展示文案，如 "8月22日 · 星期六"
export function localDateLabel(date = new Date()) {
  return `${date.getMonth() + 1}月${date.getDate()}日 · 星期${'日一二三四五六'[date.getDay()]}`
}

// 本地日期键，如 "2026-08-22"（用于按天聚合/去重）
export function localDayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 连续打卡天数：从今天（或昨天，若今天还没打卡）往回数连续有记录的天数
export function calcStreak(isoDates) {
  if (!isoDates || !isoDates.length) return 0
  const daySet = new Set(isoDates.map(d => localDayKey(d)))
  let cur = new Date()
  if (!daySet.has(localDayKey(cur))) cur.setDate(cur.getDate() - 1) // 今天还没打卡，从昨天开始算
  let n = 0
  while (daySet.has(localDayKey(cur))) {
    n += 1
    cur.setDate(cur.getDate() - 1)
  }
  return n
}

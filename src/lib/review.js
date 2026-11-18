// 次日回顾：把"昨天/前天"的那一条记录变成一句能被读懂的问候
// 目的不是统计，是让用户感到"我写下的话有人看见了"——打卡 -> 被回应 -> 明天还想来
import { localDayKey } from './date'
import { MOOD_CATEGORIES } from './garden'
import { parseMoodNote } from './moodNote'

// 一天按 24 小时走完之后再看，避免"今天早上刚打卡，中午就跟你回顾今天"
const DAY_MS = 24 * 60 * 60 * 1000

// 每种心情的回顾语气。刻意不评价好坏，只描述"那天的你"
const MOOD_TONE = {
  平静: { mood: '还算平静', words: '那天你写下的是平静' },
  愉悦: { mood: '心情不错', words: '那天你是开心的' },
  低落: { mood: '有点低落', words: '那天你有些低落' },
  难过: { mood: '很难过', words: '那天你很难过' },
  焦虑: { mood: '有些焦虑', words: '那天你心里发紧' },
  不安: { mood: '不太安稳', words: '那天你有点不安' },
  烦躁: { mood: '有些烦躁', words: '那天你有点烦躁' },
  疲惫: { mood: '很累', words: '那天你很累' },
}

const OPENERS = {
  happy: '那天的好心情，现在还在吗？',
  calm: '那天你说还好。今天呢？',
  low: '那天不太好过。今天有没有轻一点？',
  anxious: '那天的事，后来怎么样了？',
  tired: '那天你很累。今天缓过来了吗？',
}

// 找出"可以回顾的那一天"：距今 24~48 小时以内、最近的一条记录
// （不限定一天，因为用户可能隔天没来；但超过 48 小时就不再回顾，否则像翻旧账）
export function findReviewTarget(records = [], now = Date.now()) {
  if (!records || !records.length) return null
  const todayKey = localDayKey(new Date(now))
  for (const r of records) {
    if (!r || !r.created_at) continue
    const t = new Date(r.created_at).getTime()
    if (Number.isNaN(t)) continue
    const age = now - t
    if (age < DAY_MS) continue // 今天/24 小时内的，不回顾
    if (age > 2 * DAY_MS) continue // 太久远了，不回顾
    // 还要排除"和今天同一天"的记录（本地时区跨零点的情况）
    if (localDayKey(new Date(r.created_at)) === todayKey) continue
    return r
  }
  return null
}

// 生成回顾文案。返回 { dayLabel, tone, noteText, line } 或 null
export function buildReview(record) {
  if (!record || !record.mood) return null
  const { note } = parseMoodNote(record.note)
  const tone = MOOD_TONE[record.mood] || { mood: '有些说不清', words: '那天你留下了记录' }
  const category = MOOD_CATEGORIES[record.mood] || 'calm'
  const opener = OPENERS[category] || OPENERS.calm
  const dayLabel = (() => {
    const d = new Date(record.created_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((today - d) / DAY_MS)
    if (diff === 1) return '昨天'
    if (diff === 2) return '前天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  })()

  // 有笔记就引用原话——不再复述心情（原话里往往已经说明了），只留一句轻轻的追问
  // 没有笔记才补上心情描述，否则整句会空成"昨天你写下了，今天呢"
  const line = note
    ? `${dayLabel}你写下「${truncate(note, 28)}」。${opener}`
    : `${dayLabel}你是${tone.words.replace('那天', '')}。${opener}`

  return {
    dayLabel,
    mood: record.mood,
    tone: tone.mood,
    noteText: note,
    line,
  }
}

function truncate(s, n) {
  const str = String(s || '').replace(/\s+/g, ' ').trim()
  return str.length > n ? str.slice(0, n) + '…' : str
}

// 回顾是否已经被用户看过了（同一条记录只回顾一次，避免反复打扰）
const SEEN_KEY = 'liubai-review-seen'
export function markReviewSeen(recordId) {
  try {
    localStorage.setItem(SEEN_KEY, String(recordId))
  } catch {
    /* 隐私模式忽略 */
  }
}
export function isReviewSeen(recordId) {
  try {
    return localStorage.getItem(SEEN_KEY) === String(recordId)
  } catch {
    return false
  }
}

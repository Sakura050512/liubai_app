// 情绪备注中的强度标记工具（格式：【强度淡淡地】）
// 写入与解析集中在此，避免三处重复正则不一致

export const INTENSITIES = [
  { label: '淡淡地', icon: '🍃' },
  { label: '适中', icon: '🌿' },
  { label: '很强烈', icon: '🌊' },
]

const INTENSITY_RE = /^【强度(淡淡地|适中|很强烈)】/

// 组装存储文本：强度标记并入 note 开头（便于周报/统计解析）
export function buildMoodNote(intensityLabel, note = '') {
  const tag = `【强度${intensityLabel}】`
  const trimmed = (note || '').trim()
  return trimmed ? `${tag}${trimmed}` : tag
}

// 解析 note，返回 { intensity, note }（intensity 为 null 表示无标记）
export function parseMoodNote(note) {
  if (!note) return { intensity: null, note: '' }
  const m = note.match(INTENSITY_RE)
  if (m) return { intensity: m[1], note: note.slice(m[0].length) }
  return { intensity: null, note }
}

import { describe, it, expect } from 'vitest'
import { buildMoodNote, parseMoodNote } from './moodNote'

describe('buildMoodNote', () => {
  it('无备注时仅存强度标记', () => {
    expect(buildMoodNote('适中', '')).toBe('【强度适中】')
    expect(buildMoodNote('淡淡地')).toBe('【强度淡淡地】')
  })

  it('备注拼接在标记后并去除首尾空白', () => {
    expect(buildMoodNote('很强烈', ' 今天很累 ')).toBe('【强度很强烈】今天很累')
  })
})

describe('parseMoodNote', () => {
  it('解析强度标记与正文', () => {
    expect(parseMoodNote('【强度很强烈】今天很累')).toEqual({ intensity: '很强烈', note: '今天很累' })
  })

  it('标记后无正文时 note 为空串', () => {
    expect(parseMoodNote('【强度适中】')).toEqual({ intensity: '适中', note: '' })
  })

  it('无标记时返回 null 强度与原文', () => {
    expect(parseMoodNote('今天心情不错')).toEqual({ intensity: null, note: '今天心情不错' })
  })

  it('空输入安全', () => {
    expect(parseMoodNote('')).toEqual({ intensity: null, note: '' })
    expect(parseMoodNote(null)).toEqual({ intensity: null, note: '' })
  })

  it('构建后能完整往返解析', () => {
    const note = buildMoodNote('适中', '下班路上看到晚霞')
    expect(parseMoodNote(note)).toEqual({ intensity: '适中', note: '下班路上看到晚霞' })
  })
})

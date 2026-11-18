import { describe, it, expect } from 'vitest'
import { findReviewTarget, buildReview } from './review'

const HOUR = 3600 * 1000
const DAY = 24 * HOUR

const isoAgo = ms => new Date(Date.now() - ms).toISOString()

describe('findReviewTarget', () => {
  it('没有记录时返回 null', () => {
    expect(findReviewTarget([])).toBe(null)
    expect(findReviewTarget(undefined)).toBe(null)
  })

  it('24 小时以内的记录不回顾（今天刚写的）', () => {
    const records = [{ id: 'a', mood: '平静', created_at: isoAgo(2 * HOUR) }]
    expect(findReviewTarget(records)).toBe(null)
  })

  it('超过 48 小时的记录也不再回顾', () => {
    const records = [{ id: 'a', mood: '平静', created_at: isoAgo(3 * DAY) }]
    expect(findReviewTarget(records)).toBe(null)
  })

  it('落在 24~48 小时窗口内会命中', () => {
    const records = [{ id: 'a', mood: '愉悦', created_at: isoAgo(30 * HOUR) }]
    expect(findReviewTarget(records)?.id).toBe('a')
  })

  it('多条记录时取最近的一条符合窗口的', () => {
    const records = [
      { id: 'old', mood: '难过', created_at: isoAgo(5 * DAY) },
      { id: 'mid', mood: '焦虑', created_at: isoAgo(30 * HOUR) },
      { id: 'new', mood: '平静', created_at: isoAgo(1 * HOUR) },
    ]
    expect(findReviewTarget(records)?.id).toBe('mid')
  })

  it('忽略 created_at 非法的记录', () => {
    const records = [{ id: 'bad', mood: '平静', created_at: 'not-a-date' }]
    expect(findReviewTarget(records)).toBe(null)
  })
})

describe('buildReview', () => {
  it('没有 mood 返回 null', () => {
    expect(buildReview(null)).toBe(null)
    expect(buildReview({})).toBe(null)
  })

  it('引用笔记原话，并剥掉强度标记', () => {
    const r = buildReview({
      mood: '疲惫',
      created_at: isoAgo(30 * HOUR),
      note: '【强度很强烈】加班到很晚，整个人是空的',
    })
    expect(r.noteText).toBe('加班到很晚，整个人是空的')
    expect(r.line).toContain('加班到很晚')
    expect(r.line).not.toContain('【强度')
  })

  it('没有笔记时只提心情，不编造内容', () => {
    const r = buildReview({ mood: '平静', created_at: isoAgo(30 * HOUR), note: '【强度适中】' })
    expect(r.noteText).toBe('')
    expect(r.line).not.toContain('「')
  })

  it('过长的笔记会被截断并加省略号', () => {
    const long = '一'.repeat(60)
    const r = buildReview({ mood: '焦虑', created_at: isoAgo(30 * HOUR), note: long })
    expect(r.noteText.length).toBeGreaterThan(28)
    expect(r.line).toContain('…')
  })

  it('未知心情也能给出兜底文案', () => {
    const r = buildReview({ mood: '说不出的', created_at: isoAgo(30 * HOUR) })
    expect(r).not.toBe(null)
    expect(r.line.length).toBeGreaterThan(0)
  })
})

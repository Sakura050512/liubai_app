import { describe, it, expect } from 'vitest'
import { levelIndex, computeGarden, computeAchievements, MOOD_CATEGORIES, LEVELS } from './garden'

// 本地时区构造 ISO 时间(测试机为 UTC+8)
const iso = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString()
const rec = (mood, created_at) => ({ mood, created_at })

describe('levelIndex 等级边界', () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 2],
    [7, 3],
    [14, 4],
    [25, 5],
    [100, 5],
  ])('%i 天 → 第 %i 阶', (points, expectIdx) => {
    expect(levelIndex(points)).toBe(expectIdx)
    expect(LEVELS[expectIdx].need).toBeLessThanOrEqual(points)
  })
})

describe('computeGarden', () => {
  it('空记录 → 零状态', () => {
    const g = computeGarden([])
    expect(g.points).toBe(0)
    expect(g.level).toBe(0)
    expect(g.days).toEqual([])
  })

  it('同一天多条记录按天去重,保留当天最新(desc 传入)', () => {
    const g = computeGarden([
      rec('愉悦', iso(2026, 8, 20, 9)),
      rec('平静', iso(2026, 8, 20, 8)), // 当天较早,应被丢弃
      rec('难过', iso(2026, 8, 19, 9)),
    ])
    expect(g.points).toBe(2)
    const day20 = g.dayMap.get('2026-08-20')
    expect(day20.mood).toBe('愉悦')
  })

  it('8 种心情分类:愉悦→blooms、平静→calm、其余→care', () => {
    const g = computeGarden([
      rec('愉悦', iso(2026, 8, 1)),
      rec('平静', iso(2026, 8, 2)),
      rec('低落', iso(2026, 8, 3)),
      rec('焦虑', iso(2026, 8, 4)),
      rec('疲惫', iso(2026, 8, 5)),
    ])
    expect(g.blooms).toBe(1)
    expect(g.calm).toBe(1)
    expect(g.care).toBe(3)
    expect(g.points).toBe(5)
  })

  it('未知心情兜底为 calm', () => {
    const g = computeGarden([rec('外星心情', iso(2026, 8, 1))])
    expect(g.calm).toBe(1)
  })

  it('8 种心情全部在 MOOD_CATEGORIES 中有定义', () => {
    const all = ['平静', '愉悦', '低落', '难过', '焦虑', '不安', '烦躁', '疲惫']
    for (const m of all) expect(MOOD_CATEGORIES[m]).toBeTruthy()
  })
})

describe('computeAchievements', () => {
  const mk = (n, { start = new Date(2026, 0, 1), mood = '愉悦', hour = 12 } = {}) => {
    const out = []
    for (let i = 0; i < n; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      d.setHours(hour)
      out.push(rec(mood, d.toISOString()))
    }
    return out
  }
  const unlockedIds = (records, garden) =>
    computeAchievements(records, garden).filter((a) => a.unlocked).map((a) => a.id)

  it('first:记录 1 天即解锁', () => {
    const r = mk(1)
    expect(unlockedIds(r, computeGarden(r))).toContain('first')
  })

  it('week:连续 7 天解锁', () => {
    const r = mk(7)
    expect(unlockedIds(r, computeGarden(r))).toContain('week')
    const r6 = mk(6)
    expect(unlockedIds(r6, computeGarden(r6))).not.toContain('week')
  })

  it('month:累计 30 天解锁', () => {
    const r = mk(30)
    expect(unlockedIds(r, computeGarden(r))).toContain('month')
  })

  it('rainbow:集齐 8 种心情解锁', () => {
    const moods = ['平静', '愉悦', '低落', '难过', '焦虑', '不安', '烦躁', '疲惫']
    const r = moods.map((m, i) => rec(m, iso(2026, 3, i + 1)))
    expect(unlockedIds(r, computeGarden(r))).toContain('rainbow')
  })

  it('fullweek:一周七天(7 个不同星期几)解锁', () => {
    // 从周日开始的连续 7 天覆盖全部星期几
    const start = new Date(2026, 7, 23) // 2026-08-23 是周日
    const r = mk(7, { start })
    expect(unlockedIds(r, computeGarden(r))).toContain('fullweek')
  })

  it('early:清晨 8 点前记录解锁', () => {
    const r = mk(1, { hour: 6 })
    expect(unlockedIds(r, computeGarden(r))).toContain('early')
    const r2 = mk(1, { hour: 9 })
    expect(unlockedIds(r2, computeGarden(r2))).not.toContain('early')
  })

  it('night:深夜 23 点后记录解锁', () => {
    const r = mk(1, { hour: 23 })
    expect(unlockedIds(r, computeGarden(r))).toContain('night')
  })

  it('bloom:14 天(开花阶)解锁', () => {
    const r = mk(14)
    expect(unlockedIds(r, computeGarden(r))).toContain('bloom')
  })

  it('fullgarden:25 天(花满园阶)解锁', () => {
    const r = mk(25)
    expect(unlockedIds(r, computeGarden(r))).toContain('fullgarden')
  })

  it('century:100 天解锁', () => {
    const r = mk(100)
    expect(unlockedIds(r, computeGarden(r))).toContain('century')
  })

  it('未解锁成就带进度文本', () => {
    const r = mk(2)
    const list = computeAchievements(r, computeGarden(r))
    const week = list.find((a) => a.id === 'week')
    expect(week.unlocked).toBe(false)
    expect(week.progressText).toContain('2/7')
  })
})

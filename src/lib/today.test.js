import { describe, it, expect } from 'vitest'
import { buildTodayTasks, todayProgress, greeting, todaySummary } from './today'

describe('buildTodayTasks', () => {
  it('什么都没做时，先推心情，再推日记', () => {
    const tasks = buildTodayTasks({ moodDone: false, journalDone: false, hour: 10 })
    expect(tasks[0].key).toBe('mood')
    expect(tasks.map(t => t.key)).toContain('journal')
  })

  it('已打卡后不再出现心情项', () => {
    const tasks = buildTodayTasks({ moodDone: true, journalDone: false, hour: 10 })
    expect(tasks.map(t => t.key)).not.toContain('mood')
  })

  it('都做完了就没有任务', () => {
    const tasks = buildTodayTasks({ moodDone: true, journalDone: true, hour: 21 })
    expect(tasks).toEqual([])
  })

  it('晚上写日记的优先级高于白天', () => {
    const day = buildTodayTasks({ moodDone: true, journalDone: false, hour: 10 })
    const night = buildTodayTasks({ moodDone: true, journalDone: false, hour: 21 })
    expect(night[0].weight).toBeLessThan(day[0].weight)
    expect(night[0].title).toContain('睡前')
  })

  it('不再出现回顾项（次日回顾卡片已移除）', () => {
    const tasks = buildTodayTasks({ moodDone: true, journalDone: true, reviewAvailable: true })
    expect(tasks.map(t => t.key)).not.toContain('review')
  })

  it('心情项留在本页，不跳转', () => {
    const tasks = buildTodayTasks({ moodDone: false, journalDone: true })
    expect(tasks[0].to).toBe(null)
  })
})

describe('todayProgress', () => {
  it('统计已完成件数', () => {
    expect(todayProgress({ moodDone: true, journalDone: false, reviewSeen: false })).toEqual({ done: 1, total: 3 })
    expect(todayProgress({ moodDone: true, journalDone: true, reviewSeen: true })).toEqual({ done: 3, total: 3 })
  })
})

describe('greeting', () => {
  it('按时段返回不同问候', () => {
    const hours = [3, 8, 12, 16, 20, 23]
    const set = new Set(hours.map(h => greeting(h)))
    expect(set.size).toBe(hours.length)
  })
})

describe('todaySummary', () => {
  it('全部完成时给出松弛的总结', () => {
    expect(todaySummary({ moodDone: true, journalDone: true })).toContain('都做完了')
  })

  it('只差一件时说"还差一件"', () => {
    const s = todaySummary({ moodDone: true, journalDone: false })
    expect(s).toBe('还差一件：日记')
  })

  it('差多件时列出', () => {
    const s = todaySummary({ moodDone: false, journalDone: false })
    expect(s).toContain('心情')
    expect(s).toContain('日记')
  })
})

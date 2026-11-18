import { describe, it, expect } from 'vitest'
import { buildMemoryBlock, appendMemoryToBlock, MEMORY_LIMIT } from './memory'

const mem = (summary, extra = {}) => ({ summary, title: null, mood: null, ...extra })

describe('buildMemoryBlock', () => {
  it('没有记忆时返回空字符串', () => {
    expect(buildMemoryBlock([])).toBe('')
    expect(buildMemoryBlock(null)).toBe('')
    expect(buildMemoryBlock(undefined)).toBe('')
  })

  it('把记忆拼成带标题的块，最新的一条在最后', () => {
    // 传入顺序为数据库返回顺序（新 → 旧）
    const block = buildMemoryBlock([mem('最新的'), mem('较早的')])
    expect(block).toContain('【你记得的、ta 之前提过的事】')
    expect(block).toContain('· 较早的')
    expect(block).toContain('· 最新的')
    // 旧的在前面
    expect(block.indexOf('· 较早的')).toBeLessThan(block.indexOf('· 最新的'))
  })

  it('包含不要复述的叮嘱', () => {
    const block = buildMemoryBlock([mem('某件事')])
    expect(block).toContain('不要复述')
    expect(block).toContain('我记得你说过')
  })
})

describe('appendMemoryToBlock', () => {
  it('空块时直接生成完整新块', () => {
    const out = appendMemoryToBlock('', mem('第一件事'))
    expect(out).toContain('【你记得的、ta 之前提过的事】')
    expect(out).toContain('· 第一件事')
    expect(out).toContain('不要复述')
  })

  it('往已有块末尾追加一行，且保持叮嘱在最后', () => {
    const base = buildMemoryBlock([mem('旧事')])
    const out = appendMemoryToBlock(base, mem('新事'))

    expect(out).toContain('· 旧事')
    expect(out).toContain('· 新事')
    // 新事在旧事之后
    expect(out.indexOf('· 旧事')).toBeLessThan(out.indexOf('· 新事'))
    // 叮嘱仍然在最后
    expect(out.lastIndexOf('不要复述')).toBeGreaterThan(out.indexOf('· 新事'))
  })

  it('连续追加多次不会破坏结构', () => {
    let block = ''
    for (const s of ['一', '二', '三']) {
      block = appendMemoryToBlock(block, mem(s))
    }
    expect(block.match(/【你记得的、ta 之前提过的事】/g)).toHaveLength(1)
    expect(block.match(/不要复述/g)).toHaveLength(1)
    expect(block.indexOf('· 一')).toBeLessThan(block.indexOf('· 二'))
    expect(block.indexOf('· 二')).toBeLessThan(block.indexOf('· 三'))
  })

  it('块结构异常时退化为直接拼接，不丢内容', () => {
    const out = appendMemoryToBlock('奇怪的前缀', mem('兜底'))
    expect(out).toContain('奇怪的前缀')
    expect(out).toContain('· 兜底')
  })
})

describe('MEMORY_LIMIT', () => {
  it('是个合理的正数，避免 token 失控', () => {
    expect(MEMORY_LIMIT).toBeGreaterThan(0)
    expect(MEMORY_LIMIT).toBeLessThanOrEqual(10)
  })
})

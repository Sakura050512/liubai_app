import { describe, it, expect } from 'vitest'
import { isKeyboardOpen, isTextInputFocused, KEYBOARD_THRESHOLD } from './keyboard'

describe('isTextInputFocused', () => {
  it('认 input / textarea / contenteditable', () => {
    expect(isTextInputFocused({ tagName: 'INPUT' })).toBe(true)
    expect(isTextInputFocused({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isTextInputFocused({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('按钮、null 不算输入框', () => {
    expect(isTextInputFocused({ tagName: 'BUTTON' })).toBe(false)
    expect(isTextInputFocused(null)).toBe(false)
  })
})

describe('isKeyboardOpen', () => {
  const base = 880

  it('Android adjustResize：输入框聚焦 + 窗口被压缩 → 键盘', () => {
    expect(
      isKeyboardOpen({ innerHeight: base - 300, viewportBaseline: base, focusedTextInput: true })
    ).toBe(true)
  })

  it('没有输入焦点时，窗口再矮也不算键盘', () => {
    expect(
      isKeyboardOpen({ innerHeight: base - 300, viewportBaseline: base, focusedTextInput: false })
    ).toBe(false)
  })

  it('压缩量小于阈值（地址栏之类）不算键盘', () => {
    expect(
      isKeyboardOpen({
        innerHeight: base - (KEYBOARD_THRESHOLD - 1),
        viewportBaseline: base,
        focusedTextInput: true,
      })
    ).toBe(false)
  })

  it('iOS：布局视口不变、visualViewport 被键盘顶起 → 键盘', () => {
    expect(
      isKeyboardOpen({
        innerHeight: base,
        viewportBaseline: base,
        focusedTextInput: true,
        visualViewportHeight: base - 290,
      })
    ).toBe(true)
  })

  it('键盘收起后（高度回到基线）恢复为 false', () => {
    expect(
      isKeyboardOpen({ innerHeight: base, viewportBaseline: base, focusedTextInput: true })
    ).toBe(false)
  })

  it('缺 innerHeight 或基线为 0 时不误判', () => {
    expect(isKeyboardOpen({ innerHeight: 0, viewportBaseline: base, focusedTextInput: true })).toBe(false)
    expect(isKeyboardOpen({ innerHeight: 600, viewportBaseline: 0, focusedTextInput: true })).toBe(false)
  })

  it('窗口比基线高（旋转/浏览器地址栏收起）不算键盘', () => {
    expect(
      isKeyboardOpen({ innerHeight: base + 40, viewportBaseline: base, focusedTextInput: true })
    ).toBe(false)
  })
})

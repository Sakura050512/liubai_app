import { useEffect, useState } from 'react'

// 键盘至少要占掉这么高（CSS px），才认为视口是被键盘压缩了。
// 低于这个值的波动来自浏览器地址栏收起、安全区变化等，不当作键盘。
export const KEYBOARD_THRESHOLD = 150

// 焦点是否落在文字输入控件上。
export function isTextInputFocused(el) {
  if (!el || !el.tagName) return false
  const tag = el.tagName.toUpperCase()
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable === true
}

// 判断「键盘是否弹起」的纯逻辑（方便单测）：
// - Android（Capacitor，adjustResize）：窗口整体被键盘压缩，innerHeight 变小；
// - iOS / 部分 WebView：布局视口不变，visualViewport.height 变小。
// 必须同时满足「有输入框聚焦」，避免分屏、窗口缩放被误判成键盘。
export function isKeyboardOpen({
  innerHeight,
  viewportBaseline,
  focusedTextInput = false,
  visualViewportHeight,
}) {
  if (!focusedTextInput || !innerHeight) return false
  const shrunkFromBaseline =
    viewportBaseline > 0 && innerHeight < viewportBaseline - KEYBOARD_THRESHOLD
  const shrunkFromVisual =
    visualViewportHeight > 0 && visualViewportHeight < innerHeight - KEYBOARD_THRESHOLD
  return shrunkFromBaseline || shrunkFromVisual
}

/**
 * 订阅「键盘是否弹起」。
 *
 * 键盘弹起时 fixed 元素会被顶到键盘上方（底部导航栏跟着往上跑），
 * 所以需要把这个状态暴露给界面：键盘在的时候收起底部导航栏、
 * 输入框落回键盘正上方。
 *
 * 基线（没有键盘时的窗口高度）只在「视口变高」或「输入框没有焦点」时更新，
 * 键盘压缩掉的那部分高度不会被当成新的基线。
 */
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    let baseline = window.innerHeight

    const measure = () => {
      const focused = isTextInputFocused(document.activeElement)
      const height = window.innerHeight
      if (!focused) {
        // 没有输入框聚焦时，当前高度就是「完整高度」
        baseline = height
      } else if (height > baseline) {
        baseline = height
      }
      const visual = window.visualViewport
      const next = isKeyboardOpen({
        innerHeight: height,
        viewportBaseline: baseline,
        focusedTextInput: focused,
        visualViewportHeight: visual ? visual.height : 0,
      })
      setOpen(prev => (prev === next ? prev : next))
    }

    const schedule = measure

    // 横竖屏切换后窗口高度整体变了，旧基线作废
    const handleOrientation = () => {
      baseline = window.innerHeight
      setTimeout(schedule, 250)
    }

    window.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    window.addEventListener('orientationchange', handleOrientation)

    measure()

    return () => {

      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
      window.removeEventListener('orientationchange', handleOrientation)
    }
  }, [])

  return open
}

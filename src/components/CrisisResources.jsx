import { useEffect, useState } from 'react'
import { HOTLINES } from '../lib/crisis'

// 危机求助资源面板：可当底部弹层用，也可内嵌在页面里
// 号码做成 a[href="tel:"]，手机上点一下就能拨
export default function CrisisResources({ open = true, onClose = null, embedded = false }) {
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!open || embedded) return
    const onKey = e => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, embedded])

  const copy = async num => {
    try {
      await navigator.clipboard.writeText(num)
      setCopied(num)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      /* 剪贴板不可用时不打断用户 */
    }
  }

  const body = (
    <div className="w-full">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container/60 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>favorite</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.16em] text-outline uppercase mb-1">需要有人陪的时候</p>
          <p className="text-sm font-light text-on-surface-variant leading-relaxed">
            这些电话是免费的，24 小时都有人接。你不必组织好语言，直接说就好。
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {HOTLINES.map(h => (
          <div
            key={h.number}
            className="rounded-2xl bg-surface-container-low border border-outline-variant/10 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-on-surface font-normal truncate">{h.name}</p>
                <p className="text-[11px] text-outline mt-0.5 truncate">{h.desc} · {h.hours}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => copy(h.number)}
                  aria-label={`复制${h.name}号码`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  {copied === h.number ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="12" height="12" rx="2.5" />
                      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5.5A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
                    </svg>
                  )}
                </button>
                <a
                  href={`tel:${h.tel}`}
                  className="flex items-center gap-1.5 bg-primary text-on-primary rounded-full px-3.5 h-9 text-sm font-medium tracking-wide active:scale-[0.97] transition-transform"
                >
                  {h.tel === '120' ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                  ) : (
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 4h3.2l1.6 4-2 1.4a13 13 0 0 0 6.8 6.8l1.4-2 4 1.6v3.2a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
                    </svg>
                  )}
                  {h.number}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-light text-outline leading-relaxed">
        如果此刻你处于紧急危险中，请直接拨打 120（急救）或 110（报警）。
        留白会一直在这里，但它不能替代专业的帮助。
      </p>
    </div>
  )

  if (embedded) return body

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="心理援助热线"
    >
      <div className="absolute inset-0 bg-black/35" onClick={() => onClose?.()} />
      <div
        className={`relative w-full max-w-[480px] bg-surface rounded-t-3xl px-5 pt-3 pb-8 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}
      >
        <div className="w-9 h-1 rounded-full bg-outline-variant/50 mx-auto mb-4" />
        {body}
        <button
          onClick={() => onClose?.()}
          className="mt-5 w-full py-3 rounded-full text-sm font-light text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}

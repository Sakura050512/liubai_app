import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chat, SYSTEM_PROMPT_FEELING } from '../lib/ai'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'

const INIT = [{
  role: 'ai',
  text: '你好，我在这里。\n\n不需要找到完美的词语——就照你现在的样子说吧。你现在感觉怎么样？'
}]

const renderText = (text) =>
  text.split(/(「[^」]+」)/).map((part, i) =>
    part.startsWith('「')
      ? <span key={i} className="text-secondary font-medium">{part}</span>
      : part
  )

export default function NameMyFeeling() {
  const [msgs, setMsgs] = useState(INIT)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const send = async () => {
    const t = input.trim()
    if (!t || loading) return
    setInput('')
    const newMsgs = [...msgs, { role: 'user', text: t }]
    setMsgs(newMsgs)
    setLoading(true)

    try {
      // 构建完整的对话历史发给 AI
      const history = newMsgs.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }))

      const reply = await chat([
        { role: 'system', content: SYSTEM_PROMPT_FEELING },
        ...history,
      ])

      setMsgs(m => [...m, { role: 'ai', text: reply }])
    } catch {
      setMsgs(m => [...m, {
        role: 'ai',
        text: '抱歉，我现在有点走神了。能再说一遍吗？'
      }])
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <TopBar />
      <main className="flex-1 pb-44 px-6 max-w-2xl mx-auto w-full overflow-y-auto" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top))' }}>
        <header className="mb-12 animate-fade-in">
          <h2 className="font-headline text-3xl font-light tracking-tight text-on-surface mb-2">命名我的感受</h2>
          <p className="text-on-surface-variant font-light text-lg opacity-80">描述你的感受，我来帮你找到它的名字</p>
        </header>

        <div className="space-y-8">
          {msgs.map((msg, i) => (
            <div
              key={i}
              className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end ml-12' : 'justify-start mr-12'}`}
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              {msg.role === 'user' ? (
                <div className="bg-surface-container-low text-on-surface px-5 py-4 rounded-[16px] text-[15px] leading-relaxed whitespace-pre-line"
                  style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}>
                  {msg.text}
                </div>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant/15 px-6 py-5 rounded-[16px] flex flex-col gap-3"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary/60 text-xl">waves</span>
                    <span className="text-[11px] font-label tracking-[0.1em] uppercase text-outline">LiuBai</span>
                  </div>
                  <p className="text-on-surface text-[15px] leading-relaxed whitespace-pre-line">
                    {renderText(msg.text)}
                  </p>
                  {msg.text.includes('「') && (
                    <Link to="/dictionary" className="inline-flex items-center text-primary font-medium text-sm hover:opacity-70 transition-opacity">
                      查看完整词条
                      <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start mr-12">
              <div className="bg-surface-container-lowest border border-outline-variant/15 px-6 py-4 rounded-[16px]"
                style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-outline-variant animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* 输入框 */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-xl z-40">
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-[16px] p-2 flex items-center shadow-lg">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder-outline px-4 py-2 font-light text-[15px]"
            placeholder="今天有什么感受，随便说..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="bg-primary text-on-primary rounded-full p-2.5 flex items-center justify-center hover:opacity-90 transition-all active:scale-95 shadow-md disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-lg" style={{ transform: 'rotate(-45deg)' }}>
              arrow_upward
            </span>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
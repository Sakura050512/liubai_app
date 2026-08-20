import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { chat, SYSTEM_PROMPT_FEELING, SYSTEM_PROMPT_TALK } from '../lib/ai'
import { supabase } from '../lib/supabase'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'

const MODES = [
  {
    id: 'name',
    label: '命名感受',
    icon: 'label',
    prompt: SYSTEM_PROMPT_FEELING,
    intro: '你好，我在这里。\n\n不需要找到完美的词语——就照你现在的样子说吧。你现在感觉怎么样？',
  },
  {
    id: 'talk',
    label: '自由倾诉',
    icon: 'chat_bubble_outline',
    prompt: SYSTEM_PROMPT_TALK,
    intro: '我在这里，只是听。\n\n你可以随便说，说多少都行，不需要组织语言。',
  },
]

const renderText = (text) =>
  text.split(/(「[^」]+」)/).map((part, i) =>
    part.startsWith('「')
      ? <span key={i} className="text-secondary font-medium">{part}</span>
      : part
  )

export default function Talk() {
  const [mode, setMode] = useState(MODES[0])
  const [msgs, setMsgs] = useState([{ role: 'ai', text: MODES[0].intro }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const switchMode = (m) => {
    setMode(m)
    setMsgs([{ role: 'ai', text: m.intro }])
  }

  const send = async () => {
    const t = input.trim()
    if (!t || loading) return
    setInput('')
    const newMsgs = [...msgs, { role: 'user', text: t }]
    setMsgs(newMsgs)
    setLoading(true)

    let reply = ''
    try {
      const history = newMsgs.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }))
      reply = await chat([
        { role: 'system', content: mode.prompt },
        ...history,
      ])
    } catch {
      reply = mode.id === 'name'
        ? '抱歉，我现在有点走神了。能再说一遍吗？'
        : '抱歉，我现在有点走神了。能再说一遍吗？'
    }

    setMsgs(m => [...m, { role: 'ai', text: reply }])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <TopBar />

      {/* 模式切换 */}
      <div
        className="fixed top-0 left-0 right-0 z-40 px-6 pb-4 flex justify-center app-topbar"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 76px)' }}
      >
        <div className="flex gap-1 bg-surface-container-low rounded-full p-1 shadow-sm" role="tablist" aria-label="对话模式">
          {MODES.map(m => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode.id === m.id}
              onClick={() => switchMode(m)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-light transition-all duration-300 active:scale-95 ${
                mode.id === m.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-base">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <main
        className="flex-1 pb-48 px-6 max-w-2xl mx-auto w-full overflow-y-auto"
        style={{ paddingTop: 'calc(64px + env(safe-area-inset-top) + 84px)' }}
      >
        <header className="mb-8 animate-fade-in">
          <h2 className="font-display text-3xl font-medium tracking-tight text-on-surface mb-1.5">
            {mode.id === 'name' ? '给心情起个名字' : '随便说点什么'}
          </h2>
          <p className="text-on-surface-variant font-light text-base opacity-80">
            {mode.id === 'name'
              ? '描述你的感受，我来帮你找到它的名字'
              : '说完就走，或者留下来，都可以'}
          </p>
        </header>

        <div className="space-y-8">
          {msgs.map((msg, i) => (
            <div
              key={i}
              className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end ml-12' : 'justify-start mr-12'}`}
              style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
            >
              {msg.role === 'user' ? (
                <div className="bg-surface-container-low text-on-surface px-5 py-4 rounded-[16px] rounded-br-[6px] text-[15px] leading-relaxed whitespace-pre-line"
                  style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}>
                  {msg.text}
                </div>
              ) : (
                <div className="bg-surface-container-lowest border border-outline-variant/15 px-6 py-5 rounded-[16px] rounded-bl-[6px] flex flex-col gap-3"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary/60 text-xl">waves</span>
                    <span className="text-[11px] font-label tracking-[0.1em] uppercase text-outline">LiuBai</span>
                  </div>
                  <p className="text-on-surface text-[15px] leading-relaxed whitespace-pre-line">
                    {renderText(msg.text)}
                  </p>
                  {mode.id === 'name' && msg.text.includes('「') && (
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
      <div className="fixed bottom-[104px] left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-xl z-40">
        <div
          className="chat-input-shell bg-surface-container-low border border-outline-variant/20 rounded-[20px] p-2 flex items-center transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          <input
            aria-label="输入你的感受"
            className="no-focus-ring flex-1 bg-transparent border-none text-on-surface placeholder-outline px-4 py-2 font-light text-[15px]"
            placeholder={mode.id === 'name' ? '今天有什么感受，随便说...' : '这一刻，你想说些什么？'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            aria-label="发送"
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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { chat, SYSTEM_PROMPT_JOURNAL } from '../lib/ai'
import { todayRange, localDateLabel } from '../lib/date'
import TopBar from '../components/TopBar'
import ThemeToggleButton from '../components/ThemeToggleButton'
import BottomNav from '../components/BottomNav'

const PROMPTS = [
  '今天有什么让你印象深刻的瞬间？',
  '此刻，你的身体感觉怎么样？',
  '今天有什么让你感到感激的小事？',
  '如果今天的情绪有颜色，会是什么色？为什么？',
  '今天有没有什么你想对自己说的话？',
]

export default function DailyJournal() {
  const [promptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length))
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // 页面加载时检查今天是否已有日记
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { start: dayStart, end: dayEnd } = todayRange()

      // 今天的日记
      const { data: todayData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .limit(1)

      if (todayData && todayData.length > 0) {
        setText(todayData[0].content)
        if (todayData[0].ai_reflection) {
          setReflection({ text: todayData[0].ai_reflection })
        }
        setSaved(true)
      }

      // 历史日记（最近5条）
      const { data: histData } = await supabase
        .from('journal_entries')
        .select('content, created_at, ai_reflection')
        .eq('user_id', user.id)
        .lt('created_at', dayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      if (histData) setHistory(histData)
      setPageLoading(false)
    }

    load()
  }, [])

  const handleSave = async () => {
    if (!text.trim()) return
    setAiLoading(true)

    // 调用 AI 生成反思
    let aiText = ''
    try {
      aiText = await chat([
        { role: 'system', content: SYSTEM_PROMPT_JOURNAL },
        { role: 'user', content: `今天的日记：${text}` },
      ])
    } catch {
      aiText = '你今天写下的这些文字，是对自己最真诚的礼物。'
    }

    setReflection({ text: aiText })
    setAiLoading(false)
    setSaved(true)

    // 存入数据库
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { start: dayStart, end: dayEnd } = todayRange()

    // 检查今天是否已有记录（更新 or 插入）
    const { data: existing } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', dayStart.toISOString())
      .lte('created_at', dayEnd.toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase
        .from('journal_entries')
        .update({ content: text, ai_reflection: aiText })
        .eq('id', existing[0].id)
    } else {
      await supabase.from('journal_entries').insert({
        user_id: user.id,
        prompt: PROMPTS[promptIdx],
        content: text,
        ai_reflection: aiText,
      })
    }
  }

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <TopBar right={<ThemeToggleButton />} />
      <main className="flex-grow pb-32 px-6 max-w-2xl mx-auto w-full" style={{ paddingTop: 'calc(84px + env(safe-area-inset-top))' }}>

        <header className="mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary/70" style={{ fontSize: 15 }}>calendar_today</span>
            <p className="text-[11px] tracking-[0.18em] text-on-surface-variant">{localDateLabel()}</p>
          </div>
        </header>

        {/* 引导问题 */}
        <section className="mb-8 animate-slide-up">
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden border-l-4 border-primary"
            style={{ boxShadow: '0 4px 32px rgba(49,51,47,0.04)' }}>
            <div className="p-5">
              <p className="italic text-on-surface-variant font-light text-lg leading-relaxed">
                "{PROMPTS[promptIdx]}"
              </p>
            </div>
          </div>
        </section>

        {/* 写作区 */}
        <section className="relative mb-6 animate-fade-in" style={{ animationDelay: '150ms' }}>
          {pageLoading ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <p className="text-outline text-sm font-light">加载中...</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/10 p-6 transition-shadow duration-300 focus-within:border-primary/40 focus-within:shadow-glow-soft">
              <textarea
                className="no-focus-ring w-full bg-transparent border-none p-0 text-on-surface text-lg font-light resize-none placeholder:text-outline-variant/60 leading-relaxed min-h-[280px]"
                placeholder="从任何地方开始写..."
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  if (saved) { setSaved(false); setReflection(null) }
                }}
                spellCheck={false}
              />
            </div>
          )}
        </section>

        {/* AI 反思卡片 */}
        {(saved || aiLoading) && (
          <section className="mb-6 animate-slide-up">
            <div className="bg-surface-container-lowest rounded-2xl p-5 flex gap-4 items-start border border-outline-variant/10"
              style={{ boxShadow: '0 12px 48px rgba(49,51,47,0.06)' }}>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">blur_on</span>
              </div>
              <div className="pt-1 flex-1">
                {aiLoading ? (
                  <div className="flex gap-1.5 items-center h-5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-outline-variant animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface text-base font-light leading-relaxed">
                    {reflection?.text}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 保存按钮 */}
        {!saved ? (
          <div className="flex justify-end mb-10">
            <button
              onClick={handleSave}
              disabled={!text.trim() || aiLoading}
              className="bg-primary text-on-primary px-8 py-3.5 rounded-full font-medium tracking-wide flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 shadow-glow-soft"
            >
              <span className="material-symbols-outlined text-base">check</span>保存今天的记录
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-outline text-sm mb-10 animate-fade-in">
            <span className="material-symbols-outlined text-sm text-primary">check_circle</span>已保存
          </div>
        )}

        {/* 历史日记 */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
            className={`group flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full border transition-all duration-300 active:scale-95 ${
              showHistory
                ? 'bg-primary-container/40 border-primary/25 text-primary'
                : 'bg-surface-container-lowest border-outline-variant/15 text-on-surface-variant hover:border-primary/40 hover:text-primary'
            }`}
            style={{ boxShadow: '0 2px 12px rgba(49,51,47,0.04)' }}
          >
            <span
              className={`material-symbols-outlined text-base transition-transform duration-300 ${showHistory ? 'rotate-90' : ''}`}
            >
              history
            </span>
            <span className="text-sm font-light tracking-wide">{showHistory ? '收起往昔' : '翻看以前的今天'}</span>
            <span
              className={`material-symbols-outlined text-base transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}
            >
              expand_more
            </span>
          </button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {history.map((entry, i) => (
              <div key={i} className="bg-surface-container-low rounded-xl p-5">
                <p className="text-[10px] text-outline tracking-widest uppercase mb-2">
                  {new Date(entry.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                </p>
                <p className="text-on-surface text-sm font-light leading-relaxed">{entry.content}</p>
                {entry.ai_reflection && (
                  <p className="text-on-surface-variant text-xs font-light mt-3 pt-3 border-t border-outline-variant/10 italic">
                    {entry.ai_reflection}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {showHistory && history.length === 0 && (
          <p className="text-center text-outline text-sm font-light animate-fade-in">还没有历史记录</p>
        )}

      </main>
      <BottomNav />
    </div>
  )
}
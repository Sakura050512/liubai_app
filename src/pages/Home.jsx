import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'

const todayEntry = {
  zh: '冒名顶替综合症',
  en: 'Impostor Syndrome',
  desc: '一种觉得自己的成就是靠运气、随时会被人看穿的感觉。',
}

const moods = [
  { emoji: '😌', label: '平静' },
  { emoji: '😊', label: '愉悦' },
  { emoji: '😔', label: '低落' },
  { emoji: '😢', label: '难过' },
  { emoji: '😰', label: '焦虑' },
  { emoji: '😳', label: '不安' },
  { emoji: '😤', label: '烦躁' },
  { emoji: '😴', label: '疲惫' },
]

// 三档情绪强度
const intensities = [
  { label: '淡淡地', icon: '🍃' },
  { label: '适中', icon: '🌿' },
  { label: '很强烈', icon: '🌊' },
]

// 强度标记：存进 note 时带上前缀，读取时解析
const INTENSITY_PREFIX = '【强度'

const navCards = [
  {
    to: '/talk',
    icon: 'chat_bubble',
    iconBg: 'bg-primary-container/50',
    iconColor: 'text-primary',
    title: '和留白聊聊',
    desc: '为情绪命名，或只是说说——AI 都在这里倾听',
    tag: 'AI 对话',
    tagColor: 'text-primary',
    tagBg: 'bg-primary-container/40',
  },
  {
    to: '/dictionary',
    icon: 'menu_book',
    iconBg: 'bg-secondary-container/40',
    iconColor: 'text-secondary',
    title: '心理词典',
    desc: '解读内心的微妙信号，探索情绪背后的科学逻辑',
    tag: '82 个词条',
    tagColor: 'text-secondary',
    tagBg: 'bg-secondary-container/40',
  },
  {
    to: '/breathing',
    icon: 'air',
    iconBg: 'bg-tertiary-container/40',
    iconColor: 'text-tertiary',
    title: '呼吸练习',
    desc: '4-4-6-2 呼吸法，随时平复情绪',
    tag: '冥想',
    tagColor: 'text-tertiary',
    tagBg: 'bg-tertiary-container/40',
  },
  {
    to: '/weekly',
    icon: 'bar_chart',
    iconBg: 'bg-surface-container',
    iconColor: 'text-outline',
    title: '每周报告',
    desc: '查看本周情绪趋势和 AI 分析',
    tag: '数据',
    tagColor: 'text-outline',
    tagBg: 'bg-surface-container',
  },
]

export default function Home() {
  const [selectedMood, setSelectedMood] = useState(null)
  const [moodDone, setMoodDone] = useState(false)
  const [streak, setStreak] = useState(0)
  const [loadingMood, setLoadingMood] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [pendingMoodIdx, setPendingMoodIdx] = useState(null)
  const [intensityIdx, setIntensityIdx] = useState(1) // 默认"适中"

  const now = new Date()
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 · 星期${'日一二三四五六'[now.getDay()]}`
  const todayStr = now.toISOString().slice(0, 10)

  useEffect(() => {
    const checkTodayMood = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('mood_records')
        .select('mood, emoji')
        .eq('user_id', user.id)
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`)
        .limit(1)

      if (data && data.length > 0) {
        const idx = moods.findIndex(m => m.emoji === data[0].emoji)
        setSelectedMood(idx >= 0 ? idx : 0)
        setMoodDone(true)
      }

      const { count } = await supabase
        .from('mood_records')
        .select('created_at', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setStreak(count || 0)
      setLoadingMood(false)
    }

    checkTodayMood()
  }, [])

  // 第一步：选情绪，弹出备注框
  const handleMoodSelect = (i) => {
    setPendingMoodIdx(i)
    setSelectedMood(i)
    setIntensityIdx(1)
    setShowNote(true)
  }

  // 第二步：确认记录（有无备注都可以）
  const handleMoodConfirm = async () => {
    const i = pendingMoodIdx
    setShowNote(false)
    setTimeout(() => setMoodDone(true), 400)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 强度标记并入 note，便于周报/统计解析；无备注时仅存强度
    const intensityTag = `【强度${intensities[intensityIdx].label}】`
    const note = noteInput.trim()
      ? `${intensityTag}${noteInput.trim()}`
      : intensityTag

    await supabase.from('mood_records').insert({
      user_id: user.id,
      mood: moods[i].label,
      emoji: moods[i].emoji,
      note,
    })
    setNoteInput('')
    setPendingMoodIdx(null)
  }

  return (
    <div
      className="font-body text-on-surface bg-surface"
      style={{
        minHeight: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
      }}
    >
      <TopBar showSearch />

      <main
        className="mx-auto w-full"
        style={{ maxWidth: '480px', padding: 'calc(64px + env(safe-area-inset-top)) 16px 0', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col gap-5">

          {/* Hero */}
          <section className="pt-4 pb-1 animate-fade-in relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/10 mb-4">
              <span className="material-symbols-outlined text-primary/70" style={{ fontSize: 15 }}>calendar_today</span>
              <p className="text-[11px] tracking-[0.18em] text-on-surface-variant">{dateStr}</p>
            </div>
            <h2 className="font-display text-4xl font-medium leading-snug text-on-surface text-balance">
              给心灵留一点<br />
              <span className="italic text-primary">空白</span>。
            </h2>
            <div aria-hidden="true" className="absolute -top-6 -right-8 w-32 h-32 rounded-full bg-primary-container/30 blur-2xl -z-10" />
          </section>

          {/* 情绪打卡 */}
          <section
            className="bg-surface-container-lowest rounded-3xl p-5 w-full animate-slide-up border border-outline-variant/10"
            style={{ animationDelay: '60ms', boxShadow: '0 4px 32px rgba(49,51,47,0.04)' }}
          >
            {loadingMood ? (
              <div className="h-20 flex items-center justify-center">
                <p className="text-outline text-sm font-light">加载中...</p>
              </div>
            ) : !moodDone ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[11px] tracking-[0.2em] text-outline uppercase mb-0.5">每日打卡</p>
                    <p className="text-on-surface font-light text-base">此刻你的感受是？</p>
                  </div>
                  <span className="material-symbols-outlined text-primary/40 text-2xl">mood</span>
                </div>

                {/* Emoji 选择 */}
                <div className="grid grid-cols-4 gap-2">
                  {moods.map((m, i) => (
                    <button
                      key={m.label}
                      aria-pressed={selectedMood === i}
                      aria-label={`选择情绪：${m.label}`}
                      onClick={() => handleMoodSelect(i)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-300 active:scale-95 ${
                        selectedMood === i
                          ? 'bg-primary-container scale-105 shadow-sm'
                          : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <span className="text-xl leading-none">{m.emoji}</span>
                      <span className="text-[10px] text-on-surface-variant tracking-wide">{m.label}</span>
                    </button>
                  ))}
                </div>

                {/* 备注输入（选完情绪后展开） */}
                {showNote && (
                  <div className="mt-4 animate-slide-up">
                    {/* 强度选择 */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] text-outline tracking-widest uppercase flex-shrink-0">强度</span>
                      <div className="flex gap-1.5 flex-1">
                        {intensities.map((it, i) => (
                          <button
                            key={it.label}
                            aria-pressed={intensityIdx === i}
                            onClick={() => setIntensityIdx(i)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-light transition-all duration-300 active:scale-95 ${
                              intensityIdx === i
                                ? 'bg-primary-container text-on-primary-container shadow-sm'
                                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            <span>{it.icon}</span>
                            {it.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      aria-label="添加备注"
                      className="w-full bg-surface-container-low rounded-2xl px-4 py-3 text-on-surface placeholder-outline-variant text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      placeholder="添加备注，比如发生了什么...（可跳过）"
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleMoodConfirm()}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleMoodConfirm}
                        className="flex-1 bg-primary text-on-primary py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 active:scale-[0.98] shadow-glow-soft"
                      >
                        记录今天的心情
                      </button>
                      <button
                        onClick={() => { setShowNote(false); setSelectedMood(null) }}
                        className="px-4 py-3 rounded-full text-sm font-light text-outline bg-surface-container-low hover:bg-surface-container transition-all duration-300"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 已打卡状态 */
              <div className="flex items-center gap-4 py-1 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{selectedMood !== null ? moods[selectedMood].emoji : '😌'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-light">
                    今天感觉
                    <span className="text-primary font-medium mx-1">
                      {selectedMood !== null ? moods[selectedMood].label : ''}
                    </span>
                    ，已记录。
                  </p>
                  <p className="text-[11px] text-outline mt-0.5">
                    已累计记录 {streak} 次 🌿
                  </p>
                </div>
                <Link to="/journal" className="flex-shrink-0 group" aria-label="去写日记">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low transition-all duration-300 group-hover:bg-primary-container group-hover:scale-105 active:scale-90">
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-lg transition-colors">
                      arrow_forward
                    </span>
                  </span>
                </Link>
              </div>
            )}
          </section>

          {/* 今日词条 */}
          <section className="w-full animate-slide-up" style={{ animationDelay: '120ms' }}>
            <Link to="/dictionary" className="block w-full" aria-label={`查看词条：${todayEntry.zh}`}>
              <div
                  className="rounded-3xl p-5 w-full transition-all duration-300 active:scale-[0.99] bg-primary-container/25 dark:bg-primary-container/60 border border-primary/10"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] tracking-widest uppercase text-primary/70 font-medium block mb-2">
                      今日词条
                    </span>
                    <h3 className="font-display text-2xl font-medium text-on-surface mb-1 tracking-tight">
                      {todayEntry.zh}
                    </h3>
                    <p className="text-on-surface-variant/60 text-sm italic mb-3">{todayEntry.en}</p>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{todayEntry.desc}</p>
                  </div>
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-high dark:bg-primary/30"
                  >
                    <span className="material-symbols-outlined text-primary text-base">arrow_forward</span>
                  </div>
                </div>
              </div>
            </Link>
          </section>

          {/* 功能入口 */}
          <section className="w-full animate-slide-up" style={{ animationDelay: '180ms' }}>
            <div className="flex flex-col gap-3">
              {navCards.map((card) => (
                <Link
                  key={card.to}
                  to={card.to}
                  className="group flex items-center gap-4 bg-surface-container-lowest rounded-2xl px-4 py-4 w-full transition-all duration-300 active:scale-[0.99] hover:bg-surface-container-low/70 border border-outline-variant/10"
                  style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <span className={`material-symbols-outlined ${card.iconColor} text-xl`}>
                      {card.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-headline text-sm font-medium text-on-surface">{card.title}</h3>
                      <span className={`text-[9px] tracking-widest uppercase font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${card.tagBg} ${card.tagColor}`}>
                        {card.tag}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-1">{card.desc}</p>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-base flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </main>

      <BottomNav />

      {/* FAB */}
      <div
        className="fixed right-4 z-40"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom) + 12px)' }}
      >
        <Link
          to="/journal"
          className="bg-primary text-on-primary h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105"
          style={{ boxShadow: '0 8px 24px rgba(72,101,74,0.35)' }}
        >
          <span className="material-symbols-outlined text-xl">edit</span>
        </Link>
      </div>
    </div>
  )
}
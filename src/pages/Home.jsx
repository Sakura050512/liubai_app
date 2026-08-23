import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayRange, localDateLabel, calcStreak } from '../lib/date'
import { ALL_ENTRIES, todayEntry as getTodayEntry, todayEntryIndex as getTodayEntryIndex } from '../data/dictionary'
import { INTENSITIES, buildMoodNote, parseMoodNote } from '../lib/moodNote'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import { useTheme } from '../context/ThemeContext'

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

export default function Home() {
  const { isDark, toggleDark } = useTheme()
  const [selectedMood, setSelectedMood] = useState(null)
  const [moodDone, setMoodDone] = useState(false)
  const [streak, setStreak] = useState(0)
  const [totalMoods, setTotalMoods] = useState(0)
  const [loadingMood, setLoadingMood] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [pendingMoodIdx, setPendingMoodIdx] = useState(null)
  const [intensityIdx, setIntensityIdx] = useState(1) // 默认"适中"
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // 今天的打卡记录（存在则"修改"走 update，否则 insert）
  const [todayRecord, setTodayRecord] = useState(null)
  // 打卡提醒横幅（设定提醒时间后、当天未打卡时显示）
  const [showReminderBanner, setShowReminderBanner] = useState(false)

  const dateStr = localDateLabel()
  const todayEntry = getTodayEntry()
  const todayEntryIdx = getTodayEntryIndex()

  const navCards = [
    {
      to: '/dictionary',
      icon: 'menu_book',
      iconBg: 'bg-secondary-container/40',
      iconColor: 'text-secondary',
      title: '心理词典',
      desc: '解读内心的微妙信号，探索情绪背后的科学逻辑',
      tag: `${ALL_ENTRIES.length} 个词条`,
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
    {
      to: '/garden',
      icon: 'auto_awesome',
      iconBg: 'bg-tertiary-container/40',
      iconColor: 'text-tertiary',
      title: '情绪花园',
      desc: '每一次记录都是养分,看你的花园悄悄生长',
      tag: '养成',
      tagColor: 'text-tertiary',
      tagBg: 'bg-tertiary-container/40',
    },
    {
      to: '/sound',
      icon: 'waves',
      iconBg: 'bg-primary-container/40',
      iconColor: 'text-primary',
      title: '静心之声',
      desc: '白噪音、雨声、海浪…让心安静下来',
      tag: '声音',
      tagColor: 'text-primary',
      tagBg: 'bg-primary-container/40',
    },
  ]

  useEffect(() => {
    const checkTodayMood = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { start, end } = todayRange()

      // 今天的打卡记录（一天一条，取最新）
      const { data } = await supabase
        .from('mood_records')
        .select('id, mood, emoji, note')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setMoodDone(true)
        setTodayRecord(data[0])
      }

      // 连续打卡天数（最近 60 条日期算连续）+ 累计次数
      const [countRes, datesRes] = await Promise.all([
        supabase.from('mood_records').select('created_at', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('mood_records').select('created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(60),
      ])

      setTotalMoods(countRes.count || 0)
      setStreak(calcStreak((datesRes.data || []).map(r => r.created_at)))
      setLoadingMood(false)

      // 打卡提醒：超过设定时间且今天还没打卡时，显示提醒横幅
      // （用本地 data 判断，不能用 moodDone——setState 异步，此刻还是旧值）
      const reminder = localStorage.getItem('liubai-reminder') || 'off'
      const threshold = { morning: 9, noon: 13, evening: 21 }[reminder]
      const hour = new Date().getHours()
      const checkedInToday = data && data.length > 0
      if (threshold !== undefined && hour >= threshold && !checkedInToday) {
        setShowReminderBanner(true)
      }
    }

    checkTodayMood()
  }, [])

  // 第一步：选情绪，弹出备注框
  const handleMoodSelect = (i) => {
    if (saving) return
    setPendingMoodIdx(i)
    setSelectedMood(i)
    setIntensityIdx(1)
    setSaveError('')
    setShowNote(true)
  }

  // 修改今天的打卡：回到编辑状态并预填已有内容
  const startEditToday = () => {
    if (!todayRecord || saving) return
    const idx = moods.findIndex(m => m.label === todayRecord.mood)
    const { intensity, note } = parseMoodNote(todayRecord.note)
    setPendingMoodIdx(idx >= 0 ? idx : 0)
    setSelectedMood(idx >= 0 ? idx : 0)
    const intenIdx = INTENSITIES.findIndex(i => i.label === intensity)
    setIntensityIdx(intenIdx >= 0 ? intenIdx : 1)
    setNoteInput(note || '')
    setSaveError('')
    setShowNote(true)
    setMoodDone(false) // 关键：切到"未打卡"分支才会显示编辑表单
  }

  // 取消编辑：回到已打卡状态
  const cancelEdit = () => {
    setShowNote(false)
    setSelectedMood(null)
    setSaveError('')
    setMoodDone(true)
  }

  // 第二步：确认记录（有无备注都可以；已有今日记录则更新）
  const handleMoodConfirm = async () => {
    const i = pendingMoodIdx
    if (i === null || saving) return
    setSaving(true)
    setSaveError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaveError('登录状态已失效，请重新登录')
      setSaving(false)
      return
    }

    // 强度标记并入 note，便于周报/统计解析；无备注时仅存强度
    const note = buildMoodNote(INTENSITIES[intensityIdx].label, noteInput)
    const payload = { mood: moods[i].label, emoji: moods[i].emoji, note }

    const { error } = todayRecord
      ? await supabase.from('mood_records').update(payload).eq('id', todayRecord.id)
      : await supabase.from('mood_records').insert({ user_id: user.id, ...payload })

    if (error) {
      setSaveError('保存失败，请重试')
      setSaving(false)
      return
    }

    setSaving(false)
    setNoteInput('')
    setPendingMoodIdx(null)
    setShowNote(false)
    setTodayRecord(todayRecord ? { ...todayRecord, ...payload } : null)
    setMoodDone(true)
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
      <TopBar
        right={
          <button
            onClick={() => toggleDark(!isDark)}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low border border-outline-variant/10 text-on-surface-variant transition-all duration-300 hover:text-primary active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>
        }
      />

      <main
        className="mx-auto w-full"
        style={{ maxWidth: '480px', padding: 'calc(64px + env(safe-area-inset-top)) 16px 0', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col gap-5">

          {/* 打卡提醒横幅 */}
          {showReminderBanner && (
            <div className="flex items-center gap-3 bg-primary-container/40 border border-primary/20 rounded-2xl px-4 py-3 animate-fade-in">
              <span className="material-symbols-outlined text-primary flex-shrink-0">notifications</span>
              <p className="flex-1 text-sm font-light text-on-surface">
                今天还没有打卡,给自己一分钟
              </p>
              <button
                onClick={() => setShowReminderBanner(false)}
                aria-label="关闭提醒"
                className="text-outline hover:text-primary transition-colors duration-300 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

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
            {/* 右侧装饰:一株安静生长的嫩芽(呼应情绪花园) */}
            <div
              aria-hidden="true"
              className="absolute right-0 bottom-0 w-20 h-24 pointer-events-none opacity-90 animate-float"
              style={{ animationDuration: '7s' }}
            >
              <svg viewBox="0 0 96 112" fill="none" style={{ width: '100%', height: '100%' }}>
                {/* 茎 */}
                <path d="M50 108 C46 90 44 72 50 48" stroke="rgb(var(--tertiary))" strokeWidth="3.2" strokeLinecap="round" />
                {/* 左叶 */}
                <path d="M50 68 C34 64 22 52 24 38 C40 40 50 50 50 68 Z" fill="rgb(var(--primary))" opacity="0.82" />
                {/* 右叶(略高) */}
                <path d="M51 54 C68 48 78 34 76 22 C60 26 51 38 51 54 Z" fill="rgb(var(--tertiary))" opacity="0.9" />
                {/* 顶芽 */}
                <ellipse cx="51" cy="45" rx="5.5" ry="8.5" fill="rgb(var(--primary))" opacity="0.6" transform="rotate(18 51 45)" />
              </svg>
            </div>
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
                    <p className="text-[11px] tracking-[0.2em] text-outline uppercase mb-0.5">
                      {todayRecord ? '修改今日打卡' : '每日打卡'}
                    </p>
                    <p className="text-on-surface font-light text-base">
                      {todayRecord ? '此刻的感受变了吗？' : '此刻你的感受是？'}
                    </p>
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
                        {INTENSITIES.map((it, i) => (
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
                    {saveError && (
                      <p role="status" className="text-error text-xs mt-2 pl-1">{saveError}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleMoodConfirm}
                        disabled={saving}
                        className="flex-1 bg-primary text-on-primary py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-glow-soft"
                      >
                        {saving ? '记录中...' : todayRecord ? '更新今天的记录' : '记录今天的心情'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-4 py-3 rounded-full text-sm font-light text-outline bg-surface-container-low hover:bg-surface-container transition-all duration-300 disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 已打卡状态 */
              <div className="flex items-center gap-3 py-1 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{todayRecord ? todayRecord.emoji : '😌'}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm text-on-surface font-light leading-snug">
                    今天感觉
                    <span className="text-primary font-medium mx-1">
                      {todayRecord ? todayRecord.mood : ''}
                    </span>
                    ，已记录
                  </p>
                  {todayRecord?.note && parseMoodNote(todayRecord.note).note && (
                    <p className="text-xs text-on-surface-variant font-light leading-snug line-clamp-2">
                      {parseMoodNote(todayRecord.note).note}
                    </p>
                  )}
                  <p className="text-[11px] text-outline">
                    {streak > 0
                      ? <>已连续打卡 <span className="text-primary font-medium">{streak}</span> 天 · 累计 {totalMoods} 次</>
                      : <>已累计记录 {totalMoods} 次</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={startEditToday}
                    aria-label="修改今天的打卡"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low transition-all duration-300 hover:bg-primary-container active:scale-90"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant text-lg">edit</span>
                  </button>
                  <Link to="/journal" className="group" aria-label="去写日记">
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low transition-all duration-300 group-hover:bg-primary-container group-hover:scale-105 active:scale-90">
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-lg transition-colors">
                        arrow_forward
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* 今日词条 */}
          <section className="w-full animate-slide-up" style={{ animationDelay: '120ms' }}>
            <Link to="/dictionary" state={{ entryIndex: todayEntryIdx }} className="block w-full" aria-label={`查看词条：${todayEntry.zh}`}>
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

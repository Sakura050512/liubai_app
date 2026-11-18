import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { todayRange, localDateLabel, calcStreak } from '../lib/date'
import { todayEntry as getTodayEntry, todayEntryIndex as getTodayEntryIndex } from '../data/dictionary'
import { INTENSITIES, buildMoodNote, parseMoodNote } from '../lib/moodNote'
import { MOOD_CATEGORIES, MOOD_ICONS, pickCard } from '../lib/garden'
import { getSolarTerm } from '../lib/solar'
import { findReviewTarget, buildReview, isReviewSeen, markReviewSeen } from '../lib/review'
import { buildTodayTasks, greeting, todaySummary } from '../lib/today'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import ThemeToggleButton from '../components/ThemeToggleButton'
import ProfileDrawer from '../components/ProfileDrawer'

const moods = [
  { icon: 'sentiment_calm', label: '平静' },
  { icon: 'sentiment_very_satisfied', label: '愉悦' },
  { icon: 'sentiment_dissatisfied', label: '低落' },
  { icon: 'sentiment_sad', label: '难过' },
  { icon: 'sentiment_stressed', label: '焦虑' },
  { icon: 'sentiment_worried', label: '不安' },
  { icon: 'sentiment_frustrated', label: '烦躁' },
  { icon: 'bedtime', label: '疲惫' },
]

export default function Home() {
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
  // 次日回顾：昨天/前天写下的那一条，回来时轻轻提一句
  const [review, setReview] = useState(null)
  // 今天是否已写过日记（用于"今天该做什么"判断）
  const [journalDone, setJournalDone] = useState(false)
  // 打卡成功后的激励卡片
  const [moodCard, setMoodCard] = useState(null)
  // 顶栏 ☰ 打开的个人中心抽屉
  const [drawerOpen, setDrawerOpen] = useState(false)

  const dateStr = localDateLabel()
  const solarTerm = useMemo(() => getSolarTerm(), [])
  const todayEntry = getTodayEntry()
  const todayEntryIdx = getTodayEntryIndex()

  // 「今天」模块：只说今天该做什么，不再把功能表摊开
  const hi = useMemo(() => greeting(), [])
  const tasks = useMemo(
    () => buildTodayTasks({ moodDone, journalDone, reviewAvailable: !!review }),
    [moodDone, journalDone, review]
  )
  const summaryLine = useMemo(
    () => todaySummary({ moodDone, journalDone, reviewSeen: !review, hasReview: !!review }),
    [moodDone, journalDone, review]
  )

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

      // 次日回顾：取最近几天里"昨天/前天"那一条（24~48 小时窗口），
      // 同一条只回顾一次，看过就不再打扰
      const { data: recent } = await supabase
        .from('mood_records')
        .select('id, mood, emoji, note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      const target = findReviewTarget(recent || [])
      if (target && !isReviewSeen(target.id)) {
        const built = buildReview(target)
        if (built) setReview({ ...built, id: target.id })
      }

      // 今天是否已写日记（只取一条，够判断就行）
      const { start: dayStart, end: dayEnd } = todayRange()
      const { data: journalToday } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .limit(1)
      setJournalDone(!!(journalToday && journalToday.length > 0))

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
    // emoji 字段保留兼容历史数据,新数据存图标名(显示层已统一用 MOOD_ICONS)
    const payload = { mood: moods[i].label, emoji: moods[i].icon, note }

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

    // 打卡成功 → 弹出激励卡片(文案按心情分类,复用花园文案池)
    const m = moods[i]
    const category = MOOD_CATEGORIES[m.label] || 'calm'
    setMoodCard({ icon: m.icon, mood: m.label, message: pickCard(category) })
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
        left={
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="打开个人中心"
            className="material-symbols-outlined text-primary cursor-pointer hover:opacity-70 transition-opacity duration-300"
          >
            menu
          </button>
        }
        right={<ThemeToggleButton />}
      />

      <main
        className="mx-auto w-full"
        style={{ maxWidth: '480px', padding: 'calc(64px + env(safe-area-inset-top)) 16px 0', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col gap-5">

          {/* 次日回顾：让昨天写下的那句话被回应一次 */}
          {review && (
            <div id="review-card" className="relative bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/10 rounded-2xl px-4 py-3.5 animate-slide-up overflow-hidden">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-container/60 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>history</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[10px] tracking-[0.16em] text-outline uppercase mb-1">{review.dayLabel}的你</p>
                  <p className="text-sm font-light text-on-surface leading-relaxed">{review.line}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  markReviewSeen(review.id)
                  setReview(null)
                }}
                className="mt-3 ml-11 text-xs font-light text-primary/80 hover:text-primary transition-colors"
              >
                知道了
              </button>
            </div>
          )}

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
              {solarTerm && (
                <span className="text-[11px] text-primary/80 tracking-[0.14em] border-l border-outline-variant/20 pl-2.5 ml-0.5">
                  {solarTerm.today ? solarTerm.name : `距${solarTerm.name}${solarTerm.daysAway}天`}
                </span>
              )}
            </div>
            <h2 className="font-display text-4xl font-medium leading-snug text-on-surface text-balance">
              {hi.split(/[，,]/)[0]}，
              <br />
              <span className="italic text-primary">{hi.split(/[，,]/)[1] || '留一点空白'}</span>
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
            id="mood-card"
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
                      <span className="material-symbols-outlined text-[22px] leading-none text-primary/90">{m.icon}</span>
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
                  <span className="material-symbols-outlined text-xl text-primary/90">{todayRecord ? MOOD_ICONS[todayRecord.mood] || 'sentiment_satisfied' : 'sentiment_calm'}</span>
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

          {/* 今天该做什么 —— 首页的核心，替代原来摊开的功能入口 */}
          <section className="w-full animate-slide-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-baseline justify-between mb-2.5 px-1">
              <p className="text-[11px] tracking-[0.18em] text-outline uppercase">今天</p>
              <p className="text-[11px] font-light text-on-surface-variant/70">{summaryLine}</p>
            </div>

            {tasks.length > 0 ? (
              <div className="rounded-3xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden"
                style={{ boxShadow: '0 4px 32px rgba(49,51,47,0.04)' }}>
                {tasks.slice(0, 2).map((t, i) => {
                  const inner = (
                    <>
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container/45 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <span className="material-symbols-outlined text-primary text-xl">{t.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface leading-snug">{t.title}</p>
                        <p className="text-[11px] text-on-surface-variant/70 font-light mt-0.5">{t.desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant text-base flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300">
                        chevron_right
                      </span>
                    </>
                  )
                  const cls = `group w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors duration-300 active:bg-surface-container-low/60 hover:bg-surface-container-low/40 ${i > 0 ? 'border-t border-outline-variant/10' : ''}`
                  return t.to ? (
                    <Link key={t.key} to={t.to} className={cls}>{inner}</Link>
                  ) : (
                    <button
                      key={t.key}
                      onClick={() => {
                        if (t.key === 'mood') {
                          document.getElementById('mood-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        } else if (t.key === 'review') {
                          document.getElementById('review-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                      }}
                      className={cls}
                    >
                      {inner}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-3xl bg-primary-container/20 border border-primary/10 px-5 py-6 text-center"
                style={{ boxShadow: '0 4px 32px rgba(49,51,47,0.04)' }}>
                <span className="material-symbols-outlined text-primary/70 text-3xl mb-2 inline-block">spa</span>
                <p className="text-sm font-light text-on-surface">今天该做的都做完了</p>
                <p className="text-[11px] text-on-surface-variant/70 font-light mt-1">剩下的时间，怎么过都好</p>
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

          {/* 探索入口 —— 把 5 个工具收到「探索」页，首页只留这一个轻入口 */}
          <section className="w-full animate-slide-up" style={{ animationDelay: '180ms' }}>
            <Link
              to="/explore"
              className="group flex items-center gap-3 bg-surface-container-lowest rounded-2xl px-4 py-3.5 w-full transition-all duration-300 active:scale-[0.99] hover:bg-surface-container-low/70 border border-outline-variant/10"
              style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-container/40 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline text-sm font-medium text-on-surface mb-0.5">探索更多</h3>
                <p className="text-on-surface-variant/60 text-xs leading-relaxed line-clamp-1">
                  呼吸练习 · 静心之声 · 情绪花园 · 每周报告 · 心理词典
                </p>
              </div>
              <span className="material-symbols-outlined text-outline-variant text-base flex-shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300">
                chevron_right
              </span>
            </Link>
          </section>

        </div>
      </main>

      <BottomNav />

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 打卡成功激励卡片 */}
      {moodCard && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          style={{ background: 'rgba(26,28,24,.45)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => e.target === e.currentTarget && setMoodCard(null)}
        >
          <div
            role="dialog"
            aria-label="打卡鼓励"
            className="w-full max-w-sm rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-6 text-center animate-scale-in"
            style={{ boxShadow: '0 24px 70px rgba(0,0,0,.22)' }}
          >
            {/* 动效:心情符号浮动 + 光晕 */}
            <div className="relative inline-flex mb-3">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-primary-container/60 blur-xl"
                style={{ transform: 'scale(1.6)' }}
              />
              <span className="relative material-symbols-outlined text-5xl leading-none text-primary animate-float" style={{ animationDuration: '2.6s', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                {moodCard.icon}
              </span>
            </div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-primary mb-1">已记录</p>
            <h3 className="font-display text-xl font-medium text-on-surface mb-2">
              今天感觉{moodCard.mood}
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{moodCard.message}</p>
            <button
              onClick={() => setMoodCard(null)}
              className="w-full py-3 rounded-full text-sm font-medium bg-primary text-on-primary mt-5 transition-all duration-300 active:scale-[0.98]"
            >
              收下这份鼓励
            </button>
          </div>
        </div>
      )}

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

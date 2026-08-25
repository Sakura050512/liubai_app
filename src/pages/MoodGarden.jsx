import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import ErrorState from '../components/ErrorState'
import { supabase } from '../lib/supabase'
import { localDayKey, localDateLabel, calcStreak } from '../lib/date'
import { parseMoodNote } from '../lib/moodNote'
import {
  MOOD_COLORS,
  MOOD_ICONS,
  LEVELS,
  levelIndex,
  levelTip,
  LEVEL_STATUS,
  computeGarden,
  buildPlantSVG,
  computeAchievements,
} from '../lib/garden'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 8 种心情(日历图例展示用;打卡统一在首页)
const MOODS = [
  { icon: 'sentiment_calm', label: '平静' },
  { icon: 'sentiment_very_satisfied', label: '愉悦' },
  { icon: 'sentiment_dissatisfied', label: '低落' },
  { icon: 'sentiment_sad', label: '难过' },
  { icon: 'sentiment_stressed', label: '焦虑' },
  { icon: 'sentiment_worried', label: '不安' },
  { icon: 'sentiment_frustrated', label: '烦躁' },
  { icon: 'bedtime', label: '疲惫' },
]

export default function MoodGarden() {
  const [records, setRecords] = useState([]) // created_at desc
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshTick, setRefreshTick] = useState(0)

  // 快捷打卡相关状态已移除:打卡统一在首页完成,花园只做展示与反馈

  // 成就
  const [showAch, setShowAch] = useState(false)
  const [achCelebrate, setAchCelebrate] = useState(null) // 新解锁的成就(弹祝贺)

  // 日历月份导航
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })

  // 日志 / 提示
  const [showLog, setShowLog] = useState(false)
  const [toast, setToast] = useState('')
  const [tip, setTip] = useState(null)
  const [muted, setMuted] = useState(() => localStorage.getItem('liubai-garden-muted') === '1')

  // 粒子
  const [particles, setParticles] = useState([])
  const plantRef = useRef(null)
  const svgRef = useRef(null)
  const toastTimer = useRef(null)
  const prevLevelRef = useRef(0)
  const audioRef = useRef(null)

  const garden = useMemo(() => computeGarden(records), [records])
  const achievements = useMemo(() => computeAchievements(records, garden), [records, garden])
  const achUnlocked = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements])
  const todayKey = useMemo(() => localDayKey(new Date()), [])
  const todayRecord = garden.dayMap.get(todayKey) || null
  const streak = useMemo(() => calcStreak(records.map((r) => r.created_at)), [records])

  /* ---------- 数据加载 ---------- */
  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (alive) setLoadError('登录状态已失效')
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('mood_records')
        .select('id, mood, emoji, note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500)
      if (alive) {
        if (error) {
          setLoadError('花园加载失败,请稍后重试')
        } else {
          setRecords(data || [])
          prevLevelRef.current = levelIndex((data || []).length)
        }
        setLoading(false)
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [refreshTick])

  /* ---------- 新成就检测:解锁时弹一次祝贺 ---------- */
  useEffect(() => {
    if (loading || !records.length) return
    const unlockedIds = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id))
    let seen = []
    try {
      seen = JSON.parse(localStorage.getItem('liubai-garden-ach-seen') || '[]')
    } catch {
      /* noop */
    }
    const fresh = achievements.filter((a) => a.unlocked && !seen.includes(a.id))
    if (fresh.length > 0) {
      setAchCelebrate(fresh[fresh.length - 1]) // 一次只弹最新的一个
    }
    localStorage.setItem('liubai-garden-ach-seen', JSON.stringify([...new Set([...seen, ...unlockedIds])]))
  }, [loading, achievements])

  /* ---------- 音效 ---------- */
  const ensureAudio = useCallback(() => {
    if (muted) return null
    try {
      if (!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)()
      if (audioRef.current.state === 'suspended') audioRef.current.resume()
      return audioRef.current
    } catch {
      return null
    }
  }, [muted])

  const tone = useCallback(
    (freq, t0, dur, gain = 0.07, type = 'sine') => {
      const c = ensureAudio()
      if (!c) return
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = type
      o.frequency.value = freq
      g.gain.setValueAtTime(0, c.currentTime + t0)
      g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur)
      o.connect(g)
      g.connect(c.destination)
      o.start(c.currentTime + t0)
      o.stop(c.currentTime + t0 + dur + 0.05)
    },
    [ensureAudio]
  )

  const chime = useCallback(() => {
    tone(523.25, 0, 0.5, 0.07)
    tone(659.25, 0.09, 0.55, 0.06)
    tone(783.99, 0.18, 0.6, 0.05)
  }, [tone])

  const levelUpSound = useCallback(() => {
    tone(523.25, 0, 0.4, 0.08)
    tone(659.25, 0.12, 0.4, 0.08)
    tone(783.99, 0.24, 0.5, 0.08)
    tone(1046.5, 0.36, 0.8, 0.09)
  }, [tone])

  /* ---------- 提示 / 粒子 ---------- */
  const showToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2300)
  }, [])

  const burst = useCallback((x, y, color, n = 14) => {
    const items = []
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const dist = 34 + Math.random() * 52
      items.push({
        id: Math.random().toString(36).slice(2) + i,
        x,
        y,
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist - 30,
        color,
        size: 3 + Math.random() * 6,
      })
    }
    setParticles((p) => [...p, ...items])
    setTimeout(() => {
      setParticles((p) => p.filter((q) => !items.some((it) => it.id === q.id)))
    }, 1250)
  }, [])

  /* ---------- 装饰(飘落花瓣) ---------- */
  const petals = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        top: -16 - Math.random() * 20,
        size: 7 + Math.random() * 6,
        dur: 7 + Math.random() * 6,
        del: Math.random() * 8,
        dx: -(18 + Math.random() * 55),
        color: ['var(--petal-a)', 'var(--petal-b)', 'var(--petal-c)'][i % 3],
      })),
    []
  )

  /* ---------- 心情日历(可翻历史月份) ---------- */
  const calendar = useMemo(() => {
    const { y, m } = calMonth
    const startDow = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d)
      const key = localDayKey(date)
      cells.push({ key, date, record: garden.dayMap.get(key) || null })
    }
    return { y, m, cells, isCurrent: String(y) === todayKey.slice(0, 4) && m === Number(todayKey.slice(5, 7)) - 1 }
  }, [calMonth, garden.dayMap, todayKey])

  const nowYM = useMemo(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  }, [])
  const prevMonth = () =>
    setCalMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))
  const nextMonth = () =>
    setCalMonth(({ y, m }) => {
      if (y === nowYM.y && m >= nowYM.m) return { y, m } // 不能翻到未来
      return m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }
    })
  const backToToday = () => setCalMonth(nowYM)

  const showTip = (e, record) => {
    if (!record) return
    const { note } = parseMoodNote(record.note)
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({
      x: Math.min(window.innerWidth - 240, Math.max(8, rect.left + rect.width / 2 - 110)),
      y: Math.max(8, rect.top - 46),
      html: `<b>${MOOD_ICONS[record.mood] ? `<span class="material-symbols-outlined" style="font-size:15px;vertical-align:-2px">${MOOD_ICONS[record.mood]}</span>` : ''} ${record.mood}</b><br>${note ? escapeHtml(note) : '这一天,安静地记录了下来。'}`,
    })
  }

  const g = garden
  const level = g.level
  const nextLevel = level < LEVELS.length - 1 ? LEVELS[level + 1] : null
  const progress =
    nextLevel != null ? Math.min(100, ((g.points - LEVELS[level].need) / (nextLevel.need - LEVELS[level].need)) * 100) : 100

  if (loading) {
    return (
      <div className="min-h-screen bg-surface font-body text-on-surface">
        <TopBar title="情绪花园" back backTo="/" />
        <div className="flex items-center justify-center" style={{ paddingTop: '42vh' }}>
          <p className="text-outline text-sm font-light tracking-widest">花园苏醒中…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface font-body text-on-surface">
        <TopBar title="情绪花园" back backTo="/" />
        <ErrorState message={loadError} onRetry={() => setRefreshTick((t) => t + 1)} />
      </div>
    )
  }

  return (
    <div
      className="garden-page min-h-screen bg-surface font-body text-on-surface"
      style={{ minHeight: '100dvh', overflowX: 'hidden' }}
      onClick={() => setTip(null)}
    >
      <TopBar title="情绪花园" back backTo="/" />

      {/* 浇水粒子层 */}
      <div aria-hidden="true" className="garden-fx">
        {particles.map((p) => (
          <span
            key={p.id}
            className="garden-pt"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              background: p.color,
              '--gdx': `${p.dx}px`,
              '--gdy': `${p.dy}px`,
            }}
          />
        ))}
      </div>

      <main
        className="mx-auto w-full"
        style={{ maxWidth: 480, padding: 'calc(80px + env(safe-area-inset-top)) 16px calc(48px + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col gap-5">
          {/* 顶部行:日期(左) + 音量(右) */}
          <div className="flex items-center justify-between animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary/70" style={{ fontSize: 15 }}>
                calendar_today
              </span>
              <p className="text-[11px] tracking-[0.18em] text-on-surface-variant">{localDateLabel()}</p>
            </div>
            <button
              onClick={() => {
                const v = !muted
                setMuted(v)
                localStorage.setItem('liubai-garden-muted', v ? '1' : '0')
                if (!v) chime()
              }}
              aria-label={muted ? '打开音效' : '关闭音效'}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container-low border border-outline-variant/10 text-on-surface-variant transition-all duration-200 active:scale-90"
            >
              <span className="material-symbols-outlined text-base">{muted ? 'volume_off' : 'volume_up'}</span>
            </button>
          </div>

          {/* ============ 花园场景卡片 ============ */}
          <section
            className="relative overflow-hidden rounded-3xl border border-outline-variant/10 animate-fade-in"
            style={{ background: 'linear-gradient(180deg, var(--sky1), var(--sky2) 55%, var(--sky3))', boxShadow: '0 4px 32px rgba(49,51,47,0.05)' }}
          >
            {/* 氛围层:网格光斑 + 天空柔光 + 太阳/月亮 + 远山 + 云朵 + 飘落花瓣 */}
            <div aria-hidden="true" className="garden-blob garden-blob-a" />
            <div aria-hidden="true" className="garden-blob garden-blob-b" />
            <div aria-hidden="true" className="garden-skyglow" />
            <div aria-hidden="true" className="garden-grain" />
            <div aria-hidden="true" className="garden-orb-halo" />
            <div aria-hidden="true" className="garden-orb" />
            <div aria-hidden="true" className="garden-cloud" style={{ left: '8%', top: 78, width: 136, height: 32 }} />
            <div aria-hidden="true" className="garden-cloud" style={{ left: '44%', top: 112, width: 100, height: 26 }} />
            <div aria-hidden="true" className="garden-cloud" style={{ left: '68%', top: 150, width: 78, height: 22 }} />
            <div aria-hidden="true" className="garden-hill garden-hill-far" />
            <div aria-hidden="true" className="garden-hill garden-hill-near" />
            {petals.map((p) => (
              <span
                key={p.id}
                aria-hidden="true"
                className="garden-petal"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  animationDuration: `${p.dur}s`,
                  animationDelay: `${p.del}s`,
                  '--gdx': `${p.dx}px`,
                }}
              />
            ))}

            {/* 成长阶段(左上) */}
            <div className="absolute top-4 left-4 z-10">
              <p className="text-[9px] tracking-[0.22em] uppercase text-on-surface-variant/60">成长阶段</p>
              <p className="font-display text-lg font-medium text-on-surface mt-0.5 leading-tight flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-primary">{LEVELS[level].icon}</span>
                {LEVELS[level].name}
              </p>
              <p className="text-[10px] text-on-surface-variant/70 mt-1 font-light">
                第 {level + 1}/6 阶 · 已记录 {g.points} 天
              </p>
            </div>

            {/* 静音开关已移至页面右上角(与日期同行) */}

            {/* 植物(带背后柔光) */}
            <div ref={plantRef} className="plant-scene" style={{ height: 320 }}>
              <div aria-hidden="true" className="plant-glow" />
              <div
                className="plant-svg-wrap"
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: buildPlantSVG(level, g.blooms, g.calm, g.care) }}
              />
            </div>

            {/* 植物状态 */}
            <div className="relative z-10 px-6 pb-5 text-center">
              <p className="font-headline text-sm font-medium text-on-surface">{LEVEL_STATUS[level]}</p>
              <p className="text-xs text-on-surface-variant mt-1.5 font-light">
                {todayRecord
                  ? `今天已记录 · ${todayRecord.mood}`
                  : '今天还没浇水,给花园一点时间吧'}
                {streak > 0 ? ` · 连续 ${streak} 天` : ''}
              </p>
              <div className="mt-3.5">
                <div className="h-2 rounded-full bg-outline-variant/20 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--tertiary)))',
                      boxShadow: '0 0 10px rgba(72,101,74,.35)',
                      transition: 'width .6s cubic-bezier(.34,1.3,.64,1)',
                    }}
                  />
                </div>
                <p className="text-[10px] text-outline mt-1.5 tracking-wide">
                  {nextLevel
                    ? `距离「${nextLevel.name}」还差 ${nextLevel.need - g.points} 天`
                    : `已记录 ${g.points} 天 · 花园已达圆满`}
                </p>
              </div>
            </div>
          </section>

          {/* ============ 本月心情日历 ============ */}
          <section
            className="bg-surface-container-lowest rounded-3xl p-5 w-full animate-slide-up border border-outline-variant/10"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={prevMonth}
                  aria-label="上个月"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-container-low hover:text-on-surface transition-all duration-200 active:scale-90"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <p className="text-[11px] tracking-[0.18em] text-outline uppercase text-center" style={{ minWidth: 104 }}>
                  {calendar.y} 年 {calendar.m + 1} 月
                </p>
                <button
                  onClick={nextMonth}
                  aria-label="下个月"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:bg-surface-container-low hover:text-on-surface transition-all duration-200 active:scale-90"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
              {!calendar.isCurrent && (
                <button
                  onClick={backToToday}
                  className="text-[10px] font-medium text-primary px-2.5 py-1 rounded-full bg-primary-container/40 transition-all duration-200 active:scale-95"
                >
                  回到本月
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-[9px] text-outline/70 pb-1">
                  {w}
                </span>
              ))}
              {calendar.cells.map((cell, i) =>
                cell ? (
                  <button
                    key={cell.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      showTip(e, cell.record)
                    }}
                    onMouseEnter={(e) => showTip(e, cell.record)}
                    onMouseLeave={() => setTip(null)}
                    className="relative w-8 h-8 mx-auto rounded-xl flex items-center justify-center transition-transform duration-150 hover:scale-110 active:scale-95"
                    style={{
                      background: cell.record ? MOOD_COLORS[cell.record.mood]?.bg || 'rgb(var(--surface-container-low))' : 'transparent',
                      border: `1px solid ${cell.record ? MOOD_COLORS[cell.record.mood]?.bd || 'rgb(var(--outline-variant))' : 'transparent'}`,
                      boxShadow: cell.key === todayKey ? '0 0 0 2px rgb(var(--primary))' : undefined,
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px] leading-none text-primary/80">
                      {cell.record ? MOOD_ICONS[cell.record.mood] || 'sentiment_satisfied' : ''}
                    </span>
                    <span
                      className="absolute top-0.5 left-1 text-[8px] leading-none"
                      style={{ color: 'rgb(var(--on-surface))', opacity: 0.38 }}
                    >
                      {cell.date.getDate()}
                    </span>
                  </button>
                ) : (
                  <div key={`empty-${i}`} />
                )
              )}
            </div>
            {/* 图例:8 种心情 */}
            <div className="grid grid-cols-4 gap-x-2 gap-y-2.5 mt-4 pt-4 border-t border-outline-variant/10">
              {MOODS.map((m) => {
                const col = MOOD_COLORS[m.label]
                return (
                  <span key={m.label} className="flex items-center gap-1.5 text-[10px] text-outline">
                    <i className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: col.bg, border: `1px solid ${col.bd}` }} />
                    <span className="material-symbols-outlined text-[13px]">{m.icon}</span>
                    <span>
                      {m.label}
                    </span>
                  </span>
                )
              })}
            </div>
          </section>

          {/* ============ 操作 ============ */}
          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '180ms' }}>
            <button
              onClick={() => setShowAch(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-sm text-on-surface-variant hover:bg-surface-container-low transition-all duration-300 active:scale-[0.98]"
              style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              星光成就
            </button>
            <button
              onClick={() => setShowLog(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-sm text-on-surface-variant hover:bg-surface-container-low transition-all duration-300 active:scale-[0.98]"
              style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
            >
              <span className="material-symbols-outlined text-base">auto_stories</span>
              花园日志
            </button>
          </div>
        </div>
      </main>

      {/* 心情提示气泡 */}
      {tip && (
        <div
          className="fixed z-[70] rounded-xl px-3 py-2 text-xs leading-relaxed pointer-events-none"
          style={{
            left: tip.x,
            top: tip.y,
            maxWidth: 230,
            background: 'rgba(24,26,22,.94)',
            color: '#e2e3dd',
            boxShadow: '0 10px 30px rgba(0,0,0,.28)',
          }}
          dangerouslySetInnerHTML={{ __html: tip.html }}
        />
      )}

      {/* Toast */}
      <div
        className={`fixed z-[80] rounded-full px-5 py-2.5 text-sm whitespace-nowrap pointer-events-none transition-all duration-300 ${toast ? '' : ''}`}
        style={{
          top: 76,
          left: '50%',
          transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-14px)',
          opacity: toast ? 1 : 0,
          background: 'rgba(24,26,22,.94)',
          color: '#e2e3dd',
          boxShadow: '0 12px 34px rgba(0,0,0,.28)',
        }}
      >
        {toast}
      </div>

      {/* ============ 成就达成祝贺 ============ */}
      {achCelebrate && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          style={{ background: 'rgba(26,28,24,.45)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => e.target === e.currentTarget && setAchCelebrate(null)}
        >
          <div
            role="dialog"
            aria-label="成就达成"
            className="w-full max-w-sm rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-6 text-center animate-scale-in"
            style={{ boxShadow: '0 24px 70px rgba(0,0,0,.22)' }}
          >
            <div className="flex justify-center mb-3">
              <span
                className="material-symbols-outlined text-5xl text-primary animate-sound-pulse"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 300" }}
              >
                {achCelebrate.icon}
              </span>
            </div>
            <p className="text-[11px] tracking-[0.2em] uppercase text-primary mb-1">成就达成</p>
            <h3 className="font-display text-xl font-medium text-on-surface mb-2">{achCelebrate.title}</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{achCelebrate.desc}</p>
            <div className="flex gap-2 mt-6">
              <Link
                to="/me"
                className="flex-1 py-3 rounded-full text-sm font-light text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-all duration-300 active:scale-[0.98]"
              >
                看看我的
              </Link>
              <button
                onClick={() => setAchCelebrate(null)}
                className="flex-1 py-3 rounded-full text-sm font-medium text-on-primary bg-primary transition-all duration-300 active:scale-[0.98]"
              >
                收下这颗星
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 星光成就弹窗 ============ */}
      {showAch && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-5"
          style={{ background: 'rgba(26,28,24,.45)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowAch(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-5 overflow-y-auto max-h-[82vh] no-scrollbar">
            <div className="flex items-baseline justify-between mb-1">
              <p className="flex items-center gap-1.5 font-headline tracking-[0.2em] text-sm text-on-surface">
                <span className="material-symbols-outlined text-base text-primary">auto_awesome</span>
                星光成就
              </p>
              <p className="text-[11px] text-primary font-medium">
                已点亮 {achUnlocked} / {achievements.length}
              </p>
            </div>
            <p className="text-[11px] text-outline mb-4">花园会记住你的每一次认真。</p>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl p-2.5 text-center border border-outline-variant/10"
                  style={{
                    background: a.unlocked ? 'rgb(var(--primary-container))' : 'rgb(var(--surface-container-low))',
                    opacity: a.unlocked ? 1 : 0.6,
                    filter: a.unlocked ? undefined : 'grayscale(0.85)',
                  }}
                >
                  <div className="flex justify-center mb-0.5">
                    <span className={`material-symbols-outlined text-xl ${a.unlocked ? 'text-primary' : 'text-outline'}`}>{a.icon}</span>
                  </div>
                  <p className="text-xs font-medium text-on-surface">{a.title}</p>
                  <p className="text-[10px] text-outline mt-0.5 leading-relaxed">{a.desc}</p>
                  {!a.unlocked && <p className="text-[9px] text-outline mt-0.5">{a.progressText}</p>}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAch(false)}
              className="w-full py-3 rounded-full text-sm font-medium bg-primary text-on-primary mt-4 transition-all duration-300 active:scale-[0.98]"
            >
              好
            </button>
          </div>
        </div>
      )}

      {/* ============ 花园日志弹窗 ============ */}
      {showLog && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-5"
          style={{ background: 'rgba(26,28,24,.45)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowLog(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-5 overflow-y-auto max-h-[80vh] no-scrollbar">
            <p className="flex items-center gap-1.5 font-headline tracking-[0.2em] text-sm text-on-surface mb-1">
              <span className="material-symbols-outlined text-base text-primary">auto_stories</span>
              花园日志
            </p>
            <p className="text-[11px] text-outline mb-4">每一次诚实记录,都是给花园的养分。</p>
            {g.days.length === 0 ? (
              <p className="text-center py-6 text-sm text-outline">花园还空着,记录第一条心情吧</p>
            ) : (
              [...g.days]
                .reverse()
                .slice(0, 60)
                .map((r) => {
                  const { note } = parseMoodNote(r.note)
                  return (
                    <div key={r.id || r.created_at} className="flex gap-3 rounded-2xl bg-surface-container-low px-3 py-2.5 mb-2">
                      <span className="material-symbols-outlined text-xl leading-none mt-0.5 text-primary/80">{MOOD_ICONS[r.mood] || 'sentiment_satisfied'}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-outline">
                          {localDateLabel(new Date(r.created_at))} · {r.mood}
                        </p>
                        <p className="text-xs mt-0.5 leading-relaxed break-words text-on-surface-variant">
                          {note || '这一天,安静地记录了下来。'}
                        </p>
                      </div>
                    </div>
                  )
                })
            )}
            <button
              onClick={() => setShowLog(false)}
              className="w-full py-3 rounded-full text-sm font-medium bg-primary text-on-primary mt-2 transition-all duration-300 active:scale-[0.98]"
            >
              好
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

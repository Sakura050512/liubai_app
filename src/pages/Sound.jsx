import { useState, useEffect, useRef, useCallback } from 'react'
import TopBar from '../components/TopBar'
import { SOUNDS, TIMERS, play, stopSound, setVolume } from '../lib/soundEngine'

const SOUND_KEY = 'liubai-sound-state'

export default function Sound() {
  const [active, setActive] = useState(null) // 当前播放的音色 id
  const [volume, setVolumeState] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}')
      return typeof s.volume === 'number' ? s.volume : 0.7
    } catch {
      return 0.7
    }
  })
  const [timerMin, setTimerMin] = useState(null)
  const [remaining, setRemaining] = useState(null) // 剩余秒数
  const [playError, setPlayError] = useState(null) // 音源缺失的音色 id

  const timerRef = useRef(null)
  const countRef = useRef(null)
  const restoredRef = useRef(false)

  // 进入页面时恢复上次的音色与音量(音源缺失/浏览器拦截时静默)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const s = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}')
      if (s.active && SOUNDS.some((x) => x.id === s.active)) {
        const v = typeof s.volume === 'number' ? s.volume : 0.7
        setVolumeState(v)
        setVolume(v)
        play(s.active)
          .then(() => setActive(s.active))
          .catch(() => {})
      }
    } catch {
      /* noop */
    }
  }, [])

  // 播放状态变化时持久化(下次进入自动恢复)
  useEffect(() => {
    localStorage.setItem(SOUND_KEY, JSON.stringify({ active, volume }))
  }, [active, volume])

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    clearInterval(countRef.current)
    timerRef.current = null
    countRef.current = null
    setTimerMin(null)
    setRemaining(null)
  }, [])

  const startTimer = useCallback(
    (min) => {
      clearTimer()
      setTimerMin(min)
      setRemaining(min * 60)
      timerRef.current = setTimeout(() => {
        stopSound()
        setActive(null)
        setTimerMin(null)
        setRemaining(null)
      }, min * 60000)
      countRef.current = setInterval(() => setRemaining((r) => (r != null && r > 0 ? r - 1 : r)), 1000)
    },
    [clearTimer]
  )

  const toggle = async (id) => {
    if (active === id) {
      stopSound()
      setActive(null)
      return
    }
    setPlayError(null)
    try {
      await play(id)
      setActive(id)
    } catch {
      // 音源文件未就绪:展示提示,不进入播放态
      setPlayError(id)
    }
  }

  const handleVolume = (v) => {
    setVolumeState(v)
    setVolume(v)
  }

  // 卸载时停止声音与定时器
  useEffect(
    () => () => {
      stopSound()
      clearTimeout(timerRef.current)
      clearInterval(countRef.current)
    },
    []
  )

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const errorSound = SOUNDS.find((s) => s.id === playError)

  return (
    <div className="min-h-screen font-body text-on-surface bg-surface" style={{ minHeight: '100dvh' }}>
      <TopBar title="静心之声" back backTo="/" />

      <main
        className="mx-auto w-full flex flex-col relative"
        style={{ maxWidth: 480, padding: 'calc(80px + env(safe-area-inset-top)) 16px calc(150px + env(safe-area-inset-bottom))', boxSizing: 'border-box' }}
      >
        {/* 顶部氛围柔光 */}
        <div
          aria-hidden="true"
          className="absolute -top-10 right-0 w-40 h-40 rounded-full bg-primary-container/30 blur-3xl pointer-events-none"
        />

        {/* 头部 */}
        <div className="relative flex flex-col items-center pt-8 pb-7 animate-fade-in">
          <div className="relative mb-5">
            {active && (
              <>
                <span className="sound-ring" style={{ animationDelay: '0s' }} />
                <span className="sound-ring" style={{ animationDelay: '0.9s' }} />
                <span className="sound-ring" style={{ animationDelay: '1.8s' }} />
              </>
            )}
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-colors duration-300 ${
                active ? 'bg-primary-container/70' : 'bg-primary-container/40'
              }`}
            >
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 48, fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48", lineHeight: 1 }}
              >
                waves
              </span>
            </div>
          </div>
          <h2 className="font-display text-2xl font-medium text-on-surface mb-2">选一种声音,让心安静下来</h2>
          <p className="text-xs text-on-surface-variant font-light tracking-wide text-center leading-relaxed">
            {active ? `正在播放 · ${SOUNDS.find((s) => s.id === active)?.name || ''}` : '循环播放自然氛围声,适合专注与入睡'}
          </p>
        </div>

        {/* 音源未就绪提示 */}
        {errorSound && (
          <div className="relative mb-4 flex items-start gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 animate-fade-in">
            <span className="material-symbols-outlined text-outline text-lg mt-0.5 flex-shrink-0">info</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-on-surface font-light">「{errorSound.name}」的音源文件还没放进来</p>
              <p className="text-xs text-on-surface-variant font-light mt-0.5 leading-relaxed break-all">
                把音频放到 <span className="text-primary font-normal">public/sounds/{errorSound.id}.mp3</span> 后刷新即可
              </p>
            </div>
            <button
              onClick={() => setPlayError(null)}
              aria-label="关闭提示"
              className="text-outline hover:text-primary transition-colors duration-300 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* 音色选择 */}
        <div className="relative grid grid-cols-2 gap-3">
          {SOUNDS.map((s) => {
            const isActive = active === s.id
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                aria-pressed={isActive}
                className={`relative flex flex-col items-center gap-2 rounded-3xl px-4 py-5 border transition-all duration-300 active:scale-[0.97] ${
                  isActive
                    ? 'border-primary/40 bg-primary-container/60 shadow-glow-soft'
                    : 'border-outline-variant/10 bg-surface-container-lowest dark:bg-surface-container-low hover:bg-surface-container-low/70'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${isActive ? 'animate-sound-pulse' : ''}`}
                  style={{ fontSize: 30, color: s.color, fontVariationSettings: isActive ? "'FILL' 1, 'wght' 300" : "'FILL' 0, 'wght' 300" }}
                >
                  {s.icon}
                </span>
                <span className="text-sm font-medium text-on-surface">{s.name}</span>
                <span className="text-[10px] text-on-surface-variant font-light leading-snug text-center">{s.desc}</span>
                {isActive && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </main>

      {/* 底部控制栏 */}
      <div
        className="sound-bottom fixed bottom-0 left-0 right-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 -1px 0 rgba(49,51,47,0.06), 0 -8px 32px rgba(49,51,47,0.05)' }}
      >
        <div className="mx-auto w-full flex flex-col gap-3 px-6 py-4" style={{ maxWidth: 480, boxSizing: 'border-box' }}>
          {/* 定时 */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] text-outline tracking-widest uppercase mr-1">定时</span>
            {TIMERS.map((min) => (
              <button
                key={min}
                onClick={() => (timerMin === min ? clearTimer() : startTimer(min))}
                aria-pressed={timerMin === min}
                className={`px-3 py-1 rounded-full text-xs transition-all duration-200 active:scale-95 ${
                  timerMin === min ? 'bg-primary text-on-primary font-medium' : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {min} 分钟
              </button>
            ))}
            {remaining != null && (
              <span className="text-xs text-primary font-medium tabular-nums ml-1">{fmt(remaining)}</span>
            )}
          </div>

          {/* 播放 + 音量 */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => (active ? toggle(active) : null)}
              disabled={!active}
              aria-label={active ? '暂停' : '播放'}
              className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-40 flex-shrink-0"
              style={{ boxShadow: '0 8px 24px rgba(72,101,74,0.35)' }}
            >
              <span className="material-symbols-outlined text-2xl">{active ? 'pause' : 'play_arrow'}</span>
            </button>
            <div className="flex-1 flex items-center gap-3">
              <span className="material-symbols-outlined text-outline text-base">volume_down</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolume(Number(e.target.value))}
                aria-label="音量"
                className="w-full"
                style={{ accentColor: 'rgb(var(--primary))' }}
              />
              <span className="material-symbols-outlined text-outline text-base">volume_up</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

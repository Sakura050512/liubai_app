import { useState, useEffect, useRef } from 'react'
import TopBar from '../components/TopBar'

const PHASES = [
  { label: '吸气', duration: 4, scale: 1.3, color: '#48654a' },
  { label: '屏息', duration: 4, scale: 1.3, color: '#496553' },
  { label: '呼气', duration: 6, scale: 0.85, color: '#7e5731' },
  { label: '屏息', duration: 2, scale: 0.85, color: '#496553' },
]

const TOTAL_CYCLE = PHASES.reduce((s, p) => s + p.duration, 0)

const SESSIONS = [
  { label: '2 分钟', cycles: Math.round(120 / TOTAL_CYCLE) },
  { label: '5 分钟', cycles: Math.round(300 / TOTAL_CYCLE) },
  { label: '10 分钟', cycles: Math.round(600 / TOTAL_CYCLE) },
]

export default function Breathing() {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionIdx, setSessionIdx] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [countdown, setCountdown] = useState(PHASES[0].duration)
  const [cycleCount, setCycleCount] = useState(0)
  const [totalCycles, setTotalCycles] = useState(SESSIONS[0].cycles)

  const timerRef = useRef(null)
  const phaseRef = useRef(0)
  const countRef = useRef(PHASES[0].duration)
  const cycleRef = useRef(0)
  const totalRef = useRef(SESSIONS[0].cycles)

  const stop = () => {
    clearInterval(timerRef.current)
    setRunning(false)
    setPhaseIdx(0)
    setCountdown(PHASES[0].duration)
    setCycleCount(0)
    phaseRef.current = 0
    countRef.current = PHASES[0].duration
    cycleRef.current = 0
  }

const start = () => {
  setDone(false)
  setRunning(true)
  totalRef.current = SESSIONS[sessionIdx].cycles
  setTotalCycles(SESSIONS[sessionIdx].cycles)
  phaseRef.current = 0
  countRef.current = PHASES[0].duration
  cycleRef.current = 0
  setCountdown(PHASES[0].duration)
  setCycleCount(0)

  // 先设为呼气结束的小尺寸，下一帧再触发吸气动画
  setPhaseIdx(2)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setPhaseIdx(0)
    })
  })

  timerRef.current = setInterval(() => {
    countRef.current -= 1
    setCountdown(countRef.current)

    if (countRef.current <= 0) {
      const nextPhase = (phaseRef.current + 1) % PHASES.length
      phaseRef.current = nextPhase

      if (nextPhase === 0) {
        cycleRef.current += 1
        setCycleCount(cycleRef.current)
        if (cycleRef.current >= totalRef.current) {
          clearInterval(timerRef.current)
          setRunning(false)
          setDone(true)
          return
        }
      }

      countRef.current = PHASES[nextPhase].duration
      setPhaseIdx(nextPhase)
      setCountdown(PHASES[nextPhase].duration)
    }
  }, 1000)
}

  useEffect(() => () => clearInterval(timerRef.current), [])

  const phase = PHASES[phaseIdx]
  const progress = cycleCount / totalCycles

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <TopBar title="呼吸练习" back backTo="/" />

      <main className="flex-grow pb-16 flex flex-col items-center justify-center px-6" style={{ paddingTop: 'calc(64px + env(safe-area-inset-top))' }}>
        {!running && !done ? (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs animate-fade-in">
            <div className="text-center">
              <span className="material-symbols-outlined text-primary text-5xl block mb-4 animate-float"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48" }}>
                air
              </span>
              <h2 className="font-display text-3xl font-medium text-on-surface mb-2">4-4-6-2 呼吸法</h2>
              <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                吸气 4 秒 · 屏息 4 秒 · 呼气 6 秒 · 屏息 2 秒<br />
                有助于激活副交感神经，快速平静身心
              </p>
            </div>

            <div className="w-full space-y-3">
              <p className="text-[11px] text-outline uppercase tracking-widest text-center">选择时长</p>
              {SESSIONS.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setSessionIdx(i)}
                  className={`w-full py-3.5 rounded-xl font-light transition-all duration-300 ${
                    sessionIdx === i
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {s.label}
                  <span className="text-xs text-outline ml-2">（约 {s.cycles} 个循环）</span>
                </button>
              ))}
            </div>

            <button
              onClick={start}
              className="w-full bg-primary text-on-primary py-4 rounded-full font-medium tracking-wide transition-all duration-300 active:scale-[0.98] shadow-glow"
            >
              开始练习
            </button>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">check</span>
            </div>
            <div>
              <h2 className="font-display text-3xl font-medium text-on-surface mb-2">练习完成</h2>
              <p className="text-on-surface-variant font-light text-sm">
                你完成了 {totalCycles} 个呼吸循环。<br />感受一下现在的状态。
              </p>
            </div>
            <button
              onClick={() => setDone(false)}
              className="bg-primary text-on-primary px-8 py-3.5 rounded-full font-medium tracking-wide transition-all duration-300 active:scale-95"
            >
              再练一次
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-10 animate-fade-in">
            {/* 进度 */}
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-light tracking-widest">
                <span className="material-symbols-outlined text-sm" style={{ color: phase.color }}>blur_circular</span>
                <span className="font-medium" style={{ color: phase.color }}>{cycleCount + 1}</span>
                <span>/ {totalCycles} 循环</span>
              </span>
            </div>

            {/* 呼吸圆圈 */}
            <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
              {/* 最外层渐变光晕 */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 280,
                  height: 280,
                  background: `radial-gradient(circle, ${phase.color}14 0%, ${phase.color}08 45%, transparent 72%)`,
                  transform: `scale(${phase.scale})`,
                  filter: 'blur(6px)',
                  transition: `transform ${phase.duration}s cubic-bezier(0.22, 1, 0.36, 1), background ${phase.duration}s ease`,
                }}
              />
              {/* 中间渐变波纹环 */}
              <div
                className="absolute rounded-full"
                style={{
                  width: 232,
                  height: 232,
                  background: `conic-gradient(from 0deg, transparent 0%, ${phase.color}2e 12%, ${phase.color}55 25%, ${phase.color}2e 38%, transparent 50%, ${phase.color}1f 62%, ${phase.color}40 75%, transparent 88%)`,
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))',
                  transform: `scale(${phase.scale})`,
                  transition: `transform ${phase.duration}s cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
              />
              {/* 主圆：球体渐变 */}
              <div
                className="absolute rounded-full flex items-center justify-center"
                style={{
                  width: 192,
                  height: 192,
                  background: `radial-gradient(circle at 32% 28%, ${phase.color}2a 0%, ${phase.color}14 55%, ${phase.color}0d 100%)`,
                  border: `1.5px solid ${phase.color}45`,
                  transform: `scale(${phase.scale})`,
                  boxShadow: `0 0 48px ${phase.color}24, inset 0 2px 18px ${phase.color}1a, inset 0 -8px 24px ${phase.color}0d`,
                  transition: `transform ${phase.duration}s cubic-bezier(0.22, 1, 0.36, 1), background ${phase.duration}s ease, box-shadow ${phase.duration}s ease`,
                }}
              >
                <div className="text-center -mt-2">
                  <p className="font-headline text-6xl font-light text-on-surface leading-none" style={{ letterSpacing: '0.04em' }}>{countdown}</p>
                  <p className="text-[13px] font-light tracking-[0.4em] mt-3 uppercase" style={{ color: phase.color }}>{phase.label}</p>
                </div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="w-52 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%`, background: phase.color }}
              />
            </div>

            <button
              onClick={stop}
              className="inline-flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-full border border-outline-variant/20 bg-surface-container-lowest text-outline text-sm font-light transition-all duration-300 hover:border-secondary/40 hover:text-secondary active:scale-95"
              style={{ boxShadow: '0 2px 12px rgba(49,51,47,0.04)' }}
            >
              <span className="material-symbols-outlined text-base">stop</span>
              停止练习
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
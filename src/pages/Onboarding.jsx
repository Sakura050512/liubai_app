import { useState } from 'react'
import { supabase } from '../lib/supabase'

const slides = [
  {
    icon: 'self_improvement',
    title: '欢迎来到留白',
    subtitle: '给心灵留一点空白',
    desc: '这里是一个安静的地方。没有评判，没有压力，只有你和你自己。',
    color: 'text-primary',
    bg: 'bg-primary-container/20',
    glow: 'rgba(72,101,74,0.12)',
  },
  {
    icon: 'mood',
    title: '记录你的情绪',
    subtitle: '每天只需一秒钟',
    desc: '每日情绪打卡，帮你发现情绪的规律。时间久了，你会更了解自己。',
    color: 'text-secondary',
    bg: 'bg-secondary-container/20',
    glow: 'rgba(126,87,49,0.12)',
  },
  {
    icon: 'menu_book',
    title: '心理词典',
    subtitle: '为你的感受命名',
    desc: '很多情绪有专属的名字。当你能准确描述自己的感受，它的力量就减半了。',
    color: 'text-tertiary',
    bg: 'bg-tertiary-container/20',
    glow: 'rgba(73,101,83,0.12)',
  },
  {
    icon: 'auto_stories',
    title: '每日日记',
    subtitle: '写下来，就轻了',
    desc: 'AI 会在你写完后给出一段温柔的心理学视角反思，不说教，只陪伴。',
    color: 'text-primary',
    bg: 'bg-primary-container/20',
    glow: 'rgba(72,101,74,0.12)',
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const next = () => {
    if (step < slides.length - 1) {
      setLeaving(true)
      setTimeout(() => { setStep(s => s + 1); setLeaving(false) }, 250)
    } else {
      localStorage.setItem('liubai-onboarded', 'true')
      onDone()
    }
  }

  const skip = () => {
    localStorage.setItem('liubai-onboarded', 'true')
    onDone()
  }

  const slide = slides[step]

  return (
    <div className="min-h-screen bg-surface font-body flex flex-col items-center justify-between px-8 py-12 relative overflow-hidden">
      {/* 背景氛围光晕 */}
      <div aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl transition-all duration-500"
        style={{ background: slide.glow }} />
      <div aria-hidden="true" className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary-container/30 blur-3xl" />

      {/* Skip */}
      <div className="w-full flex justify-end relative z-10">
        {step < slides.length - 1 && (
          <button onClick={skip} className="text-outline text-sm font-light hover:text-primary transition-colors px-3 py-2">
            跳过
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="flex flex-col items-center text-center flex-1 justify-center max-w-sm relative z-10"
        style={{ opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(12px) scale(0.98)' : 'none', transition: 'all 250ms ease' }}
      >
        {/* Icon */}
        <div className={`relative w-32 h-32 rounded-full ${slide.bg} flex items-center justify-center mb-10`}>
          <div aria-hidden="true" className="absolute inset-0 rounded-full animate-breathe" style={{ background: slide.glow, filter: 'blur(12px)' }} />
          <span className={`material-symbols-outlined ${slide.color} text-6xl relative`}
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48" }}>
            {slide.icon}
          </span>
        </div>

        <p className={`text-xs tracking-[0.3em] uppercase font-medium mb-3 ${slide.color}`}>
          {slide.subtitle}
        </p>
        <h2 className="font-display text-4xl font-medium text-on-surface mb-5 tracking-tight text-balance">
          {slide.title}
        </h2>
        <p className="text-on-surface-variant font-light text-base leading-relaxed max-w-xs">
          {slide.desc}
        </p>
      </div>

      {/* Bottom */}
      <div className="w-full flex flex-col items-center gap-6 relative z-10">
        {/* Dots */}
        <div className="flex gap-2" role="tablist" aria-label="引导页进度">
          {slides.map((_, i) => (
            <div key={i} role="tab" aria-selected={i === step} aria-label={`第 ${i + 1} 页`}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-7 h-2 bg-primary' : 'w-2 h-2 bg-outline-variant/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full max-w-xs bg-primary text-on-primary py-4 rounded-full font-medium tracking-wide transition-all duration-300 active:scale-[0.98] hover:opacity-90 shadow-glow"
        >
          {step < slides.length - 1 ? '继续' : '开始使用'}
        </button>
      </div>
    </div>
  )
}

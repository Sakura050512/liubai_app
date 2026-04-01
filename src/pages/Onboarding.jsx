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
  },
  {
    icon: 'mood',
    title: '记录你的情绪',
    subtitle: '每天只需一秒钟',
    desc: '每日情绪打卡，帮你发现情绪的规律。时间久了，你会更了解自己。',
    color: 'text-secondary',
    bg: 'bg-secondary-container/20',
  },
  {
    icon: 'menu_book',
    title: '心理词典',
    subtitle: '为你的感受命名',
    desc: '很多情绪有专属的名字。当你能准确描述自己的感受，它的力量就减半了。',
    color: 'text-tertiary',
    bg: 'bg-tertiary-container/20',
  },
  {
    icon: 'auto_stories',
    title: '每日日记',
    subtitle: '写下来，就轻了',
    desc: 'AI 会在你写完后给出一段温柔的心理学视角反思，不说教，只陪伴。',
    color: 'text-primary',
    bg: 'bg-primary-container/20',
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
    <div className="min-h-screen bg-surface font-body flex flex-col items-center justify-between px-8 py-12">
      {/* Skip */}
      <div className="w-full flex justify-end">
        {step < slides.length - 1 && (
          <button onClick={skip} className="text-outline text-sm font-light hover:text-primary transition-colors">
            跳过
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="flex flex-col items-center text-center flex-1 justify-center max-w-sm"
        style={{ opacity: leaving ? 0 : 1, transform: leaving ? 'translateY(12px)' : 'none', transition: 'all 250ms ease' }}
      >
        {/* Icon */}
        <div className={`w-28 h-28 rounded-full ${slide.bg} flex items-center justify-center mb-10`}>
          <span className={`material-symbols-outlined ${slide.color} text-6xl`}
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48" }}>
            {slide.icon}
          </span>
        </div>

        <p className={`text-xs tracking-[0.3em] uppercase font-medium mb-3 ${slide.color}`}>
          {slide.subtitle}
        </p>
        <h2 className="font-headline text-3xl font-light text-on-surface mb-5 tracking-tight">
          {slide.title}
        </h2>
        <p className="text-on-surface-variant font-light text-base leading-relaxed">
          {slide.desc}
        </p>
      </div>

      {/* Bottom */}
      <div className="w-full flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-outline-variant/40'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full max-w-xs bg-primary text-on-primary py-4 rounded-full font-medium tracking-wide transition-all duration-300 active:scale-95 hover:opacity-90"
          style={{ boxShadow: '0 8px 24px rgba(72,101,74,0.25)' }}
        >
          {step < slides.length - 1 ? '继续' : '开始使用'}
        </button>
      </div>
    </div>
  )
}
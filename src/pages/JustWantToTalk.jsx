import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { chat, SYSTEM_PROMPT_FEELING } from '../lib/ai'
import BottomNav from '../components/BottomNav'

const FALLBACK_REFLECTIONS = [
  '听起来今天很重。谢谢你愿意说出来。',
  '你不需要解释。我在这里，只是听。',
  '把它说出来，已经需要很大的勇气了。',
  '不管这段话飘向哪里，它都曾经被接住过。',
]

export default function JustWantToTalk() {
  const [text, setText] = useState('')
  const [destiny, setDestiny] = useState('vanish')
  const [submitted, setSubmitted] = useState(false)
  const [reflection, setReflection] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setLoading(true)

    // 调用 AI
    let reply = ''
    try {
      reply = await chat([
        { role: 'system', content: SYSTEM_PROMPT_FEELING },
        { role: 'user', content: text },
      ])
    } catch {
      reply = FALLBACK_REFLECTIONS[Math.floor(Math.random() * FALLBACK_REFLECTIONS.length)]
    }

    setReflection(reply)

    // 只有选择"留下来"才存数据库
    if (destiny === 'keep') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('talk_records').insert({
          user_id: user.id,
          content: text,
          destiny,
        })
      }
    }

    setLoading(false)
    setSubmitted(true)
  }

  return (
    <div
      className="min-h-screen flex flex-col font-body bg-surface"
    >
      <header
        className="fixed top-0 w-full z-50 bg-surface flex items-center justify-between px-6 h-16"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(64px + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">notes</span>
          <div>
            <h1 className="text-xl font-semibold text-on-surface tracking-widest font-headline">只是想说说</h1>
            <p className="text-[10px] text-outline uppercase tracking-[0.1em]">说完就走，或者留下来，都可以</p>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col pt-32 pb-40 px-8 max-w-2xl mx-auto w-full">
        {!submitted ? (
          <section className="flex-grow flex flex-col">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl font-light placeholder:text-outline-variant text-on-surface resize-none flex-grow leading-relaxed min-h-[280px]"
              placeholder="这一刻，你想说些什么？"
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={loading}
            />
            <div className="mt-10 space-y-5">
              {[
                { val: 'vanish', label: '说完就消失' },
                { val: 'keep', label: '留下来，我以后想看' },
              ].map(opt => (
                <label
                  key={opt.val}
                  className="flex items-center cursor-pointer"
                  onClick={() => setDestiny(opt.val)}
                >
                  <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center transition-all duration-300 ${destiny === opt.val ? 'border-primary' : 'border-outline'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${destiny === opt.val ? 'bg-primary' : 'bg-transparent'}`} />
                  </div>
                  <span className={`text-sm font-light transition-colors ${destiny === opt.val ? 'text-on-surface' : 'text-outline-variant'}`}>
                    {opt.label}
                  </span>
                </label>
              ))}

              <div className="flex justify-end pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || loading}
                  className="bg-primary text-on-primary px-10 py-4 rounded-full font-medium tracking-wide active:scale-95 transition-all duration-500 flex items-center gap-2 group disabled:opacity-40 shadow-lg"
                >
                  {loading ? (
                    <>
                      <span className="text-sm">正在倾听</span>
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-on-primary animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <span>发送</span>
                      <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-grow flex flex-col items-center justify-center text-center space-y-10 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-3xl font-light text-on-surface font-headline">已经收到了。</h3>
              <p className="text-sm text-outline-variant font-light">你不是一个人。</p>
            </div>
            <div
              className="w-full p-8 rounded-2xl text-left border border-outline-variant/20 glass"
            >
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary pt-1">auto_awesome</span>
                <p className="text-lg font-light leading-relaxed text-on-surface">{reflection}</p>
              </div>
            </div>
            {destiny === 'keep' && (
              <p className="flex items-center gap-2 text-outline-variant text-sm">
                <span className="material-symbols-outlined text-sm">bookmark</span>这段话已保存到你的记录
              </p>
            )}
            <button
              onClick={() => { setText(''); setSubmitted(false); setReflection('') }}
              className="text-outline-variant text-sm font-light hover:text-on-surface transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>继续说
            </button>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
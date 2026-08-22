import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { chat } from '../lib/ai'
import MoodTrendChart from '../components/MoodTrendChart'
import TopBar from '../components/TopBar'

const moodColors = {
  '平静': '#48654a', '低落': '#7e5731', '焦虑': '#9e422c',
  '愉悦': '#496553', '烦躁': '#704b26', '难过': '#5b7fa6',
  '不安': '#8a6bb0', '疲惫': '#6b7280',
}

// 轻量 Markdown 渲染：分段 + **加粗**（不引入额外依赖）
const renderMarkdown = (text = '') =>
  text.split(/\n{2,}/).map((para, i) => (
    <p key={i} className="mb-2 last:mb-0 whitespace-pre-line">
      {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j} className="font-medium text-on-surface">{part.slice(2, -2)}</strong>
          : part
      )}
    </p>
  ))

export default function WeeklyReport() {
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [data, setData] = useState({ moods: [], journals: [], talks: 0 })
  const [report, setReport] = useState('')
  const [generated, setGenerated] = useState(false)
  const [savedReports, setSavedReports] = useState([])
  const [expandedReport, setExpandedReport] = useState(null)

  // 读取历史周报（本地存储）
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('liubai-weekly-reports') || '[]')
      setSavedReports(list)
    } catch { /* 忽略损坏数据 */ }
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoStr = weekAgo.toISOString()

      const [moodRes, journalRes, talkRes] = await Promise.all([
        supabase.from('mood_records').select('mood, emoji, created_at, note')
          .eq('user_id', user.id).gte('created_at', weekAgoStr).order('created_at'),
        supabase.from('journal_entries').select('content, ai_reflection, created_at')
          .eq('user_id', user.id).gte('created_at', weekAgoStr).order('created_at'),
        supabase.from('talk_records').select('id', { count: 'exact', head: true })
          .eq('user_id', user.id).gte('created_at', weekAgoStr),
      ])

      setData({
        moods: moodRes.data || [],
        journals: journalRes.data || [],
        talks: talkRes.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const generateReport = async () => {
    if (!data.moods.length && !data.journals.length) return
    setAiLoading(true)

    // 解析强度标记，情绪摘要包含强度信息
    const parseIntensity = (note) => {
      if (!note) return ''
      const m = note.match(/^【强度(淡淡地|适中|很强烈)】/)
      return m ? m[1] : ''
    }
    const cleanNote = (note) => (note || '').replace(/^【强度(淡淡地|适中|很强烈)】/, '')

    const moodSummary = data.moods.map(m => {
      const inten = parseIntensity(m.note)
      const n = cleanNote(m.note)
      return `${m.mood}${inten ? `(${inten}强度)` : ''}${n ? `（${n}）` : ''}`
    }).join('、')
    const journalSummary = data.journals.map(j => j.content.slice(0, 50)).join('；')

    try {
      const reply = await chat([
        {
          role: 'system',
          content: `你是"留白"App的AI情绪分析师。
根据用户这一周的情绪打卡和日记数据，生成一份简短温暖的周报。
格式：先用1-2句话概括本周整体情绪基调，然后指出1个值得关注的情绪模式，最后给1条具体的自我关怀建议。
总字数控制在120字以内，语气温柔，不说教。`,
        },
        {
          role: 'user',
          content: `本周情绪记录（${data.moods.length}次）：${moodSummary || '无'}
本周日记摘要（${data.journals.length}篇）：${journalSummary || '无'}
本周树洞记录：${data.talks}条`,
        },
      ])
      setReport(reply)
      setGenerated(true)
      saveReport(reply)
    } catch {
      const fallback = '本周你记录了 ' + data.moods.length + ' 次情绪，' + data.journals.length + ' 篇日记。坚持记录本身就是一种自我关怀。'
      setReport(fallback)
      setGenerated(true)
      saveReport(fallback)
    }
    setAiLoading(false)
  }

  // 周报保存到本地（生成后不再重复花钱生成）
  const saveReport = (reportText) => {
    try {
      const list = JSON.parse(localStorage.getItem('liubai-weekly-reports') || '[]')
      const item = {
        week: dateRange,
        savedAt: new Date().toISOString(),
        report: reportText,
        moods: data.moods.length,
        journals: data.journals.length,
        talks: data.talks,
      }
      const idx = list.findIndex(r => r.week === dateRange)
      if (idx >= 0) list[idx] = item
      else list.unshift(item)
      localStorage.setItem('liubai-weekly-reports', JSON.stringify(list.slice(0, 12)))
    } catch { /* localStorage 不可用时静默忽略 */ }
  }

  // 统计情绪分布
  const moodCounts = {}
  data.moods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1 })
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 6)
  const dateRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${now.getMonth() + 1}/${now.getDate()}`

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      {/* 返回按钮 */}
      <TopBar title="每周报告" back backTo="/" />

      <main className="flex-grow pb-16 px-5 max-w-lg mx-auto w-full" style={{ paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>
        {/* 日期范围 */}
        <div className="mb-6 animate-fade-in">
          <p className="text-[11px] tracking-[0.25em] text-outline uppercase">{dateRange}</p>
          <h2 className="font-display text-3xl font-medium text-on-surface mt-1">本周回顾</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0,1,2].map(i => <div key={i} className="bg-surface-container-low rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* 数据卡片行（与"我的"页统计卡片同款 UI） */}
            <div className="grid grid-cols-3 gap-3 mb-5 animate-slide-up">
              {[
                { icon: 'mood', label: '情绪打卡', value: data.moods.length, unit: '次', color: 'text-primary', bg: 'bg-primary-container/30' },
                { icon: 'auto_stories', label: '日记', value: data.journals.length, unit: '篇', color: 'text-secondary', bg: 'bg-secondary-container/30' },
                { icon: 'chat_bubble', label: '心里话', value: data.talks, unit: '条', color: 'text-tertiary', bg: 'bg-tertiary-container/30' },
              ].map(s => (
                <div key={s.label}
                  className="bg-surface-container-lowest px-3.5 py-3.5 rounded-2xl flex flex-col items-center text-center border border-outline-variant/10"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}
                >
                  <p className="text-on-surface-variant text-xs font-semibold mb-2 truncate">{s.label}</p>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${s.color} p-1.5 ${s.bg} rounded-full text-lg flex-shrink-0 flex items-center justify-center`}>
                      {s.icon}
                    </span>
                    <p className={`text-2xl font-bold ${s.color} font-headline leading-tight`}>
                      {s.value}
                      <span className="text-xs font-light text-outline ml-0.5">{s.unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 情绪分布 */}
            {data.moods.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 mb-5 animate-slide-up"
                style={{ animationDelay: '80ms', boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                <p className="text-[11px] text-outline uppercase tracking-widest mb-4">情绪分布</p>
                {Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                  <div key={mood} className="flex items-center gap-3 mb-3 last:mb-0">
                    <span className="text-sm text-on-surface-variant w-10 shrink-0">{mood}</span>
                    <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / data.moods.length) * 100}%`, background: moodColors[mood] || '#48654a' }}
                      />
                    </div>
                    <span className="text-xs text-outline w-4 text-right shrink-0">{count}</span>
                  </div>
                ))}
                {topMood && (
                  <p className="text-xs text-on-surface-variant font-light mt-4 pt-4 border-t border-outline-variant/10">
                    本周最常见的情绪是
                    <span className="font-medium text-on-surface mx-1">{topMood[0]}</span>
                    （{topMood[1]} 次）
                  </p>
                )}
              </div>
            )}

            {/* 本周情绪轨迹 */}
            {data.moods.length > 0 && (
              <div className="bg-surface-container-lowest rounded-2xl p-5 mb-5 animate-slide-up"
                style={{ animationDelay: '120ms', boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                <p className="text-[11px] text-outline uppercase tracking-widest mb-3">本周情绪轨迹</p>
                <MoodTrendChart records={data.moods} days={7} />
              </div>
            )}

            {/* AI 周报 */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 mb-5 animate-slide-up"
              style={{ animationDelay: '160ms', boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary/60 text-xl">blur_on</span>
                <p className="text-[11px] text-outline uppercase tracking-widest">AI 周报</p>
              </div>

              {generated ? (
                <div className="text-on-surface font-light text-sm leading-relaxed max-h-80 overflow-y-auto pr-1">
                  {renderMarkdown(report)}
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4">
                  <p className="text-on-surface-variant text-sm font-light">
                    {data.moods.length + data.journals.length > 0
                      ? '根据本周数据生成一份个性化情绪周报'
                      : '本周还没有足够的记录，去打个卡再回来吧'}
                  </p>
                  {(data.moods.length + data.journals.length > 0) && (
                    <button
                      onClick={generateReport}
                      disabled={aiLoading}
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 shadow-glow-soft"
                    >
                      {aiLoading ? (
                        <>
                          <span>生成中</span>
                          <div className="flex gap-1">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1 h-1 rounded-full bg-on-primary animate-bounce"
                                style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          生成本周报告
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 历史周报（本地保存） */}
            {savedReports.length > 0 && (
              <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <p className="text-[11px] text-outline uppercase tracking-widest mb-3 pl-1">历史周报</p>
                <div className="space-y-3">
                  {savedReports.map((r, i) => (
                    <div key={i} className="bg-surface-container-low rounded-xl p-4">
                      <button
                        onClick={() => setExpandedReport(expandedReport === i ? null : i)}
                        aria-expanded={expandedReport === i}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <span className="text-sm font-light text-on-surface">{r.week}</span>
                        <span className="flex items-center gap-2">
                          {r.moods !== undefined && (
                            <span className="text-[10px] text-outline">情绪 {r.moods} · 日记 {r.journals}</span>
                          )}
                          <span className={`material-symbols-outlined text-outline text-base transition-transform duration-300 ${expandedReport === i ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </span>
                      </button>
                      {expandedReport === i && (
                        <div className="text-on-surface-variant text-sm font-light leading-relaxed mt-3 pt-3 border-t border-outline-variant/10">
                          {renderMarkdown(r.report)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 本周日记摘要 */}
            {data.journals.length > 0 && (
              <div className="animate-slide-up" style={{ animationDelay: '240ms' }}>
                <p className="text-[11px] text-outline uppercase tracking-widest mb-3 pl-1">本周日记</p>
                <div className="space-y-3">
                  {data.journals.map((j, i) => (
                    <div key={i} className="bg-surface-container-low rounded-xl p-4">
                      <p className="text-[10px] text-outline tracking-widest uppercase mb-2">
                        {new Date(j.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-on-surface text-sm font-light leading-relaxed line-clamp-3">{j.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calcStreak } from '../lib/date'
import { parseMoodNote } from '../lib/moodNote'
import { MOOD_ICONS, MOOD_COLORS } from '../lib/garden'

const QUICK_LINKS = [
  { to: '/garden', icon: 'auto_awesome', label: '情绪花园' },
  { to: '/weekly', icon: 'bar_chart', label: '每周报告' },
  { to: '/dictionary', icon: 'menu_book', label: '心理词典' },
]

// 顶栏 ☰ 打开的「个人中心抽屉」：快速瞥一眼本周状态，不打断当前页面
export default function ProfileDrawer({ open, onClose }) {
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌿')
  const [weekCounts, setWeekCounts] = useState({ mood: 0, journal: 0, talk: 0 })
  const [recentMoods, setRecentMoods] = useState([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)

        const [profileRes, moodsRes, journalRes, talkRes] = await Promise.all([
          supabase.from('users_profile').select('nickname').eq('id', user.id).maybeSingle(),
          supabase
            .from('mood_records')
            .select('id, mood, emoji, note, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(60),
          supabase
            .from('journal_entries')
            .select('id, created_at')
            .eq('user_id', user.id)
            .gte('created_at', weekAgo.toISOString()),
          supabase
            .from('talk_records')
            .select('id, created_at')
            .eq('user_id', user.id)
            .gte('created_at', weekAgo.toISOString()),
        ])

        if (cancelled) return

        const allMoods = moodsRes.data || []
        setNickname(profileRes.data?.nickname || '')
        setAvatar(localStorage.getItem('liubai-avatar') || '🌿')
        setRecentMoods(allMoods.slice(0, 10))
        setStreak(calcStreak(allMoods.map((m) => m.created_at)))

        setWeekCounts({
          mood: allMoods.filter((m) => new Date(m.created_at) >= weekAgo).length,
          journal: (journalRes.data || []).length,
          talk: (talkRes.data || []).length,
        })
      } catch {
        // 静默：抽屉是辅助信息，失败不影响主流程
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [open])

  // ESC 关闭 + 锁定背景滚动
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const statItems = [
    { label: '打卡', value: weekCounts.mood },
    { label: '日记', value: weekCounts.journal },
    { label: '倾诉', value: weekCounts.talk },
  ]

  return (
    <>
      {/* 遮罩 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[55] transition-opacity duration-300"
        style={{
          background: 'rgba(26,28,24,.35)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />

      {/* 抽屉背板 */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="个人中心"
        className="fixed top-0 left-0 bottom-0 z-[56] w-[86%] max-w-[340px] bg-surface flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-102%)',
          boxShadow: '8px 0 40px rgba(49,51,47,.12)',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* 头部：头像 + 昵称 */}
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-2xl flex-shrink-0">
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-xl font-medium text-on-surface truncate">
                {nickname || '留白的朋友'}
              </p>
              <p className="text-on-surface-variant/60 text-xs mt-0.5">
                {loading ? '读取中…' : streak > 0 ? `已连续打卡 ${streak} 天` : '今天还没打卡'}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭"
              className="material-symbols-outlined text-outline flex-shrink-0 hover:text-primary transition-colors"
            >
              close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
          {/* 本周三格 */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="bg-surface-container-lowest rounded-2xl px-2 py-3 text-center border border-outline-variant/10"
              >
                <p className="font-display text-xl font-medium text-primary leading-none mb-1">
                  {s.value}
                </p>
                <p className="text-[10px] text-on-surface-variant/60 tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 最近的心情 */}
          <div className="mb-6">
            <h3 className="text-[10px] tracking-widest uppercase text-on-surface-variant/60 font-medium mb-3">
              最近的心情
            </h3>
            {recentMoods.length === 0 ? (
              <p className="text-on-surface-variant/50 text-xs font-light">还没有记录</p>
            ) : (
              <div className="flex items-center gap-1.5">
                {recentMoods.map((m, i) => {
                  // note 形如【强度适中】备注，心情名在 mood 字段
                  const moodName = m.mood || '平静'
                  const icon = MOOD_ICONS[moodName] || MOOD_ICONS['平静']
                  const tone = MOOD_COLORS[moodName] || MOOD_COLORS['平静']
                  const { note } = parseMoodNote(m.note)
                  return (
                    <span
                      key={m.id}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: tone.bg,
                        border: `1px solid ${tone.bd}33`,
                        opacity: 0.45 + (i / Math.max(recentMoods.length, 1)) * 0.55,
                      }}
                      title={note || moodName}
                    >
                      <span className="material-symbols-outlined text-[13px]" style={{ color: tone.bd }}>
                        {icon}
                      </span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* 去走走 */}
          <div className="mb-6">
            <h3 className="text-[10px] tracking-widest uppercase text-on-surface-variant/60 font-medium mb-3">
              去走走
            </h3>
            <div className="flex flex-col gap-1">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-surface-container-low transition-colors duration-200"
                >
                  <span className="material-symbols-outlined text-primary/70 text-lg">{l.icon}</span>
                  <span className="text-sm font-light text-on-surface">{l.label}</span>
                  <span className="material-symbols-outlined text-outline-variant text-sm ml-auto">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 底部：完整个人中心 */}
        <div className="px-6 pt-3 pb-6 border-t border-outline-variant/10">
          <Link
            to="/me"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-primary-container/40 text-primary py-3 rounded-full text-sm font-light transition-all active:scale-[0.98] hover:bg-primary-container/60"
          >
            <span className="material-symbols-outlined text-base">person</span>
            完整的个人中心
          </Link>
        </div>
      </aside>
    </>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { ALL_ENTRIES } from '../data/dictionary'
import { parseMoodNote } from '../lib/moodNote'
import { MOOD_ICONS } from '../lib/garden'
import { localDayKey } from '../lib/date'
import { setupDailyReminder } from '../lib/notification'
import MoodTrendChart from '../components/MoodTrendChart'
import EmptyState from '../components/EmptyState'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import ThemeToggleButton from '../components/ThemeToggleButton'

const TABS = ['概览', '情绪', '心里话', '收藏']

const AVATARS = ['🌿', '🌸', '🍃', '🌊', '☁️', '🌙', '⭐', '🦋', '🌻', '🍀', '🌈', '🪷', '🫧', '🕊️', '🐚', '🌾']

const REMINDER_OPTIONS = [
  { id: 'off', label: '不提醒', desc: '随心记录，不打扰' },
  { id: 'morning', label: '早上 9:00', desc: '开启元气的一天' },
  { id: 'noon', label: '中午 13:00', desc: '午后给自己一分钟' },
  { id: 'evening', label: '晚上 21:00', desc: '睡前回顾这一天' },
]

const moodColors = {
  '平静': '#48654a', '低落': '#7e5731', '焦虑': '#9e422c',
  '愉悦': '#496553', '烦躁': '#704b26', '难过': '#5b7fa6',
  '不安': '#8a6bb0', '疲惫': '#6b7280',
}

export default function Me() {
  const { isDark, toggleDark } = useTheme()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('liubai-avatar') || '🌿')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [reminder, setReminder] = useState(() => localStorage.getItem('liubai-reminder') || 'off')
  const [reminderResult, setReminderResult] = useState(null)
  const [profile, setProfile] = useState({ nickname: '旅行者' })
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState({ moods: 0, journals: 0, talks: 0 })
  const [recentJournals, setRecentJournals] = useState([])
  const [moodHistory, setMoodHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const [talkHistory, setTalkHistory] = useState([])
  const [removeTalkId, setRemoveTalkId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('users_profile')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof)
      } else {
        await supabase.from('users_profile')
          .upsert({ id: user.id, nickname: '旅行者' }, { onConflict: 'id' })
      }

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 14)

      const [moodRes, journalRes, talkRes, moodHistRes, journalListRes, favRes, talkListRes] = await Promise.all([
        supabase.from('mood_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('talk_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('mood_records').select('mood, emoji, created_at, note')
          .eq('user_id', user.id).gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false }).limit(30),
        supabase.from('journal_entries').select('content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('dictionary_favorites').select('entry_zh, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('talk_records').select('id, mode, content, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])

      setStats({ moods: moodRes.count || 0, journals: journalRes.count || 0, talks: talkRes.count || 0 })
      setMoodHistory(moodHistRes.data || [])
      setRecentJournals(journalListRes.data || [])
      setFavorites(favRes.data || [])
      setTalkHistory(talkListRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const saveNickname = async () => {
    setEditing(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('users_profile').update({ nickname: profile.nickname }).eq('id', user.id)
  }

  const removeFavorite = async (entryZh) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('dictionary_favorites').delete().eq('user_id', user.id).eq('entry_zh', entryZh)
    setFavorites(prev => prev.filter(f => f.entry_zh !== entryZh))
  }

  // 删除一段心里话（两段式确认）
  const removeTalk = async (id) => {
    if (removeTalkId !== id) {
      setRemoveTalkId(id)
      setTimeout(() => setRemoveTalkId(prev => (prev === id ? null : prev)), 2500)
      return
    }
    await supabase.from('talk_records').delete().eq('id', id)
    setTalkHistory(prev => prev.filter(t => t.id !== id))
    setRemoveTalkId(null)
  }

  const handleSignOut = async () => {
    setShowSignOutConfirm(false)
    await supabase.auth.signOut()
  }

  // 导出全部数据为 JSON 文件(情绪/日记/心里话/收藏)
  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [moods, journals, talks, favs] = await Promise.all([
        supabase.from('mood_records').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('talk_records').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        supabase.from('dictionary_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ])
      const payload = {
        app: '留白',
        exportedAt: new Date().toISOString(),
        mood_records: moods.data || [],
        journal_entries: journals.data || [],
        talk_records: talks.data || [],
        dictionary_favorites: favs.data || [],
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liubai-export-${localDayKey(new Date())}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      /* 导出失败:保持现状即可 */
    } finally {
      setExporting(false)
    }
  }

  const statCards = [
    { icon: 'storm', color: 'text-primary', bg: 'bg-primary-container/30', label: '情绪打卡', value: stats.moods, accent: 'text-primary' },
    { icon: 'auto_stories', color: 'text-secondary', bg: 'bg-secondary-container/30', label: '日记记录', value: stats.journals, accent: 'text-secondary' },
    { icon: 'chat_bubble', color: 'text-tertiary', bg: 'bg-tertiary-container/30', label: '心里话', value: stats.talks, accent: 'text-tertiary' },
  ]

  const moodCounts = {}
  moodHistory.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1 })
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">

      {/* 关于留白弹窗 */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setShowAbout(false)}
          role="dialog"
          aria-modal="true"
          aria-label="关于留白"
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-[2rem] p-8 pb-12 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-8" />
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-primary-container flex items-center justify-center text-4xl shadow-glow-soft">
                🌿
              </div>
              <div>
                <h2 className="font-display text-3xl font-medium text-on-surface tracking-wide mb-1">留白</h2>
                <p className="text-outline text-xs tracking-widest">心灵的数字庇护所</p>
              </div>
              <p className="text-on-surface-variant text-sm font-light leading-relaxed max-w-xs">
                留白是一个专注心理健康的私人空间。记录情绪、书写日记、探索内心——在这里，你只需要做自己。
              </p>
              <div className="w-full h-px bg-outline-variant/10 my-1" />
              <div className="w-full space-y-3 text-left">
                {[
                  { icon: 'lock', label: '数据隐私', desc: '你的所有记录只属于你自己' },
                  { icon: 'psychology', label: 'AI 伴侣', desc: '基于心理学的温柔陪伴，不评判' },
                  { icon: 'favorite', label: '用心制作', desc: '希望你在这里感到被接纳' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-on-surface text-sm font-medium">{item.label}</p>
                      <p className="text-on-surface-variant text-xs font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="mt-2 w-full bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-light transition-all active:scale-95"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提醒设置弹窗 */}
      {showReminder && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setShowReminder(false)}
          role="dialog"
          aria-modal="true"
          aria-label="打卡提醒设置"
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-[2rem] p-8 pb-12 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-8" />
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-primary text-2xl">notifications</span>
              <h2 className="font-display text-2xl font-medium text-on-surface">每日打卡提醒</h2>
            </div>
            <p className="text-on-surface-variant text-sm font-light leading-relaxed mb-6">
              设定后，超过该时间且今天还没打卡时，App 会在首页轻轻提醒你。
            </p>
            <div className="space-y-2.5 mb-6">
              {REMINDER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setReminder(opt.id)
                    localStorage.setItem('liubai-reminder', opt.id)
                    setReminderResult(null)
                    setupDailyReminder(opt.id).then(r => setReminderResult(r))
                  }}
                  aria-pressed={reminder === opt.id}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border transition-all duration-300 active:scale-[0.99] ${
                    reminder === opt.id
                      ? 'bg-primary-container/40 border-primary/30'
                      : 'bg-surface-container-low border-transparent hover:bg-surface-container'
                  }`}
                >
                  <span className="flex-1 text-left min-w-0">
                    <span className={`block text-sm font-light ${reminder === opt.id ? 'text-primary' : 'text-on-surface'}`}>{opt.label}</span>
                    <span className="block text-[11px] text-outline mt-0.5">{opt.desc}</span>
                  </span>
                  {reminder === opt.id && (
                    <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-outline-variant text-center mt-3">
              {reminderResult
                ? reminderResult.ok
                  ? '已设置系统级每日提醒(手机通知)'
                  : `${reminderResult.reason || '设置失败'}`
                : '设置后会在手机通知栏提醒你打卡'}
            </p>
          </div>
        </div>
      )}

      {/* 退出登录确认弹窗 */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          style={{ background: 'rgba(26,28,24,.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowSignOutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-label="确认退出登录"
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-6 text-center animate-scale-in"
            style={{ boxShadow: '0 24px 70px rgba(0,0,0,.22)' }}
            onClick={e => e.stopPropagation()}
          >
            <span className="material-symbols-outlined text-3xl text-outline mb-2">logout</span>
            <h3 className="font-display text-lg font-medium text-on-surface mb-2">退出登录?</h3>
            <p className="text-sm text-on-surface-variant font-light leading-relaxed">
              退出后需要重新输入邮箱和密码登录,你的记录仍会安全保存在云端。
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-light text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-all duration-300 active:scale-[0.98]"
              >
                再想想
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 py-2.5 rounded-full text-sm font-medium text-on-error bg-error transition-all duration-300 active:scale-[0.98]"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 隐私说明弹窗 */}
      {showPrivacy && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={() => setShowPrivacy(false)}
          role="dialog"
          aria-modal="true"
          aria-label="隐私说明"
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-[2rem] p-8 pb-12 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-8" />
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-primary text-2xl">lock</span>
              <h2 className="font-display text-2xl font-medium text-on-surface">隐私说明</h2>
            </div>
            <div className="space-y-4 mt-6">
              {[
                { icon: 'database', title: '数据存储', desc: '你的日记、情绪记录、收藏等数据保存在私有云端数据库中（行级安全），只有你自己能读写。' },
                { icon: 'cloud_sync', title: 'AI 对话', desc: '与「留白」的对话会发送给第三方 AI 服务（DeepSeek）用于生成回复，不会被用于其他目的。' },
                { icon: 'warning', title: '温馨提示', desc: '请不要在日记或对话中输入身份证号、银行卡号等敏感信息。' },
                { icon: 'download', title: '数据导出', desc: '导出全部记录(情绪/日记/心里话/收藏)为 JSON 文件', action: true },
              ].map(item => (
                item.action ? (
                  <button
                    key={item.title}
                    onClick={handleExport}
                    disabled={exporting}
                    className="w-full flex items-start gap-3 text-left rounded-xl px-1 py-1 transition-all duration-200 active:scale-[0.99] disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">{item.icon}</span>
                    <span className="flex-1">
                      <span className="block text-on-surface text-sm font-medium">{item.title}</span>
                      <span className="block text-on-surface-variant text-xs font-light leading-relaxed mt-0.5">{item.desc}</span>
                    </span>
                    <span className="material-symbols-outlined text-primary text-base mt-1">{exporting ? 'hourglass_top' : 'download'}</span>
                  </button>
                ) : (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary/60 text-base mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-on-surface text-sm font-medium">{item.title}</p>
                      <p className="text-on-surface-variant text-xs font-light leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                )
              ))}
            </div>
            <button
              onClick={() => setShowPrivacy(false)}
              className="mt-8 w-full bg-surface-container-low text-on-surface py-3 rounded-full text-sm font-light transition-all active:scale-95"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      <TopBar
        title="留白"
        left={
          <button
            onClick={() => setShowSignOutConfirm(true)}
            aria-label="退出登录"
            className="text-outline hover:text-primary transition-colors duration-300 p-1 -ml-1"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        }
        right={<ThemeToggleButton />}
      />

      <main className="max-w-screen-md mx-auto px-5 pb-32" style={{ paddingTop: 'calc(80px + env(safe-area-inset-top))' }}>

        {/* 用户信息 */}
        <section className="mt-4 mb-8 flex flex-col items-start animate-fade-in">

          {/* 头像 + 选择器 */}
          <div className="relative mb-5">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="w-20 h-20 rounded-full bg-surface-container-low ring-4 ring-surface-container flex items-center justify-center text-4xl active:scale-95 transition-all duration-300"
            >
              {avatar}
            </button>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center pointer-events-none">
              <span className="material-symbols-outlined text-on-primary" style={{ fontSize: 12 }}>edit</span>
            </div>
          </div>

          {showAvatarPicker && (
            <div className="bg-surface-container-low rounded-2xl p-4 mb-4 w-full animate-fade-in">
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map(e => (
                  <button
                    key={e}
                    onClick={() => {
                      setAvatar(e)
                      localStorage.setItem('liubai-avatar', e)
                      setShowAvatarPicker(false)
                    }}
                    className={`text-2xl p-1.5 rounded-xl transition-all active:scale-90 ${
                      avatar === e ? 'bg-primary-container' : 'hover:bg-surface-container'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 昵称 */}
          {editing ? (
            <input
              aria-label="编辑昵称"
              className="font-display text-3xl font-medium tracking-tight text-on-surface mb-1 bg-transparent border-b border-primary focus:ring-0 pb-1 w-48 outline-none"
              value={profile.nickname}
              onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))}
              onBlur={saveNickname}
              onKeyDown={e => e.key === 'Enter' && saveNickname()}
              autoFocus
            />
          ) : (
            <h2
              className="font-display text-3xl font-medium tracking-tight text-on-surface mb-1 cursor-pointer hover:text-primary transition-colors duration-300 flex items-center gap-2"
              onClick={() => setEditing(true)}
            >
              {profile.nickname}
              <span className="material-symbols-outlined text-outline text-sm">edit</span>
            </h2>
          )}
          <p className="text-on-surface-variant font-light tracking-wide text-sm">寻觅一处属于心灵的留白</p>
        </section>

        {/* 统计卡片 */}
        <section className="mb-6">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => <div key={i} className="bg-surface-container-lowest p-4 rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {statCards.map(s => (
                <div key={s.label}
                  className="bg-surface-container-lowest px-3.5 py-3.5 rounded-2xl flex flex-col items-center text-center border border-outline-variant/10"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}
                >
                  <p className="text-on-surface-variant text-xs font-semibold mb-2 truncate">{s.label}</p>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined ${s.color} p-1.5 ${s.bg} rounded-full text-lg flex-shrink-0 flex items-center justify-center`}>
                      {s.icon}
                    </span>
                    <p className={`text-2xl font-bold ${s.accent} font-headline leading-tight`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 bg-surface-container-low rounded-2xl p-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              aria-pressed={activeTab === i}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === i
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {tab}
              {tab === '收藏' && favorites.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary-container text-primary px-1.5 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
              {tab === '心里话' && talkHistory.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary-container text-primary px-1.5 py-0.5 rounded-full">
                  {talkHistory.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: 概览 ── */}
        {activeTab === 0 && (
          <section className="animate-fade-in space-y-6">
            <div>
              <h3 className="font-headline text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3 pl-1">
                近期日记
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[0,1,2].map(i => <div key={i} className="bg-surface-container-low p-4 rounded-xl h-14 animate-pulse" />)}
                </div>
              ) : recentJournals.length > 0 ? (
                <div className="space-y-2">
                  {recentJournals.map((entry, i) => (
                    <Link key={i} to="/journal"
                      className="block bg-surface-container-low p-4 rounded-xl transition-all duration-300 hover:bg-surface-container hover:translate-x-1">
                      <p className="text-[10px] font-medium tracking-[0.1em] text-outline uppercase mb-1">
                        {new Date(entry.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-on-surface text-sm font-light leading-relaxed line-clamp-2">{entry.content}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-outline-variant text-3xl block mb-2">auto_stories</span>
                  <p className="text-on-surface-variant text-sm font-light">还没有日记记录</p>
                  <Link to="/journal" className="text-primary text-sm font-light mt-1 inline-block hover:opacity-70 transition-opacity">
                    去写第一篇吧
                  </Link>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-headline text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3 pl-1">
                外观
              </h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low mb-3">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-outline">
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span className="text-on-surface font-light">{isDark ? '深色模式' : '浅色模式'}</span>
                </div>
                <button
                  onClick={() => toggleDark(!isDark)}
                  aria-label="切换深浅色模式"
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${
                    isDark ? 'bg-primary' : 'bg-surface-container-high'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow-sm ${
                    isDark ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-headline text-xs font-semibold tracking-widest text-on-surface-variant uppercase mb-3 pl-1">
                设置
              </h3>
              <div className="space-y-1">
                <button onClick={() => setShowPrivacy(true)} className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors duration-300">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">lock</span>
                    <span className="text-on-surface font-light">隐私设置</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
                </button>
                <button onClick={() => setShowReminder(true)} className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors duration-300">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">notifications</span>
                    <span className="text-on-surface font-light">提醒</span>
                    {reminder !== 'off' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/40 text-primary">
                        {REMINDER_OPTIONS.find(o => o.id === reminder)?.label}
                      </span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
                </button>
                <button
                  onClick={() => setShowAbout(true)}
                  className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors duration-300"
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">info</span>
                    <span className="text-on-surface font-light">关于留白</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Tab: 情绪 ── */}
        {activeTab === 1 && (
          <section className="animate-fade-in">
            {loading ? (
              <div className="space-y-3">
                {[0,1,2,3].map(i => <div key={i} className="bg-surface-container-low p-4 rounded-xl h-12 animate-pulse" />)}
              </div>
            ) : moodHistory.length > 0 ? (
              <>
                {/* 近 14 天情绪趋势 */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 mb-4 border border-outline-variant/10"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                  <p className="text-[11px] text-outline uppercase tracking-widest mb-3">情绪趋势(近14天)</p>
                  <MoodTrendChart records={moodHistory} days={14} />
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-5 mb-4 border border-outline-variant/10"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                  <p className="text-[11px] text-outline uppercase tracking-widest mb-4">情绪分布(近14天)</p>
                  {Object.entries(moodCounts).sort((a, b) => b[1] - a[1]).map(([mood, count]) => (
                    <div key={mood} className="flex items-center gap-3 mb-3 last:mb-0">
                      <span className="text-sm text-on-surface-variant w-10 shrink-0">{mood}</span>
                      <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(count / moodHistory.length) * 100}%`, background: moodColors[mood] || '#48654a' }}
                        />
                      </div>
                      <span className="text-xs text-outline w-4 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                  {topMood && (
                    <p className="text-xs text-on-surface-variant font-light mt-4 pt-4 border-t border-outline-variant/10">
                      最常见情绪：
                      <span className="font-medium text-on-surface mx-1">{topMood[0]}</span>
                      （{topMood[1]} 次）
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {moodHistory.map((m, i) => {
                    const { intensity, note } = parseMoodNote(m.note)
                    return (
                      <div key={i} className="flex items-start gap-3 bg-surface-container-low px-4 py-3 rounded-xl">
                        <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5 text-primary/80">{MOOD_ICONS[m.mood] || 'sentiment_satisfied'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-on-surface text-sm font-light">{m.mood}</p>
                            {intensity && (
                              <span className="text-[9px] tracking-widest px-1.5 py-0.5 rounded-full bg-primary-container/40 text-primary">
                                {intensity}
                              </span>
                            )}
                          </div>
                          {note && (
                            <p className="text-on-surface-variant text-xs font-light mt-0.5 leading-relaxed line-clamp-2">{note}</p>
                          )}
                        </div>
                        <p className="text-[10px] text-outline tracking-wide shrink-0 mt-0.5">
                          {new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-outline-variant text-4xl block mb-3">mood</span>
                <p className="text-on-surface-variant text-sm font-light">还没有情绪记录</p>
                <Link to="/" className="text-primary text-sm font-light mt-2 inline-block hover:opacity-70 transition-opacity">
                  去首页打卡
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── Tab: 心里话 ── */}
        {activeTab === 2 && (
          <section className="animate-fade-in">
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="bg-surface-container-low p-4 rounded-xl h-20 animate-pulse" />)}
              </div>
            ) : talkHistory.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] text-outline tracking-widest uppercase pl-1 mb-3">
                  你留住过的 {talkHistory.length} 段对话
                </p>
                {talkHistory.map(t => (
                  <div key={t.id} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10"
                    style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-container/40 text-primary">
                          {t.mode || '自由倾诉'}
                        </span>
                        <span className="text-[10px] text-outline tracking-wide">
                          {new Date(t.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <button
                        onClick={() => removeTalk(t.id)}
                        aria-label="删除这段心里话"
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all duration-300 active:scale-95 ${
                          removeTalkId === t.id
                            ? 'bg-error-container/40 border-error/40 text-error'
                            : 'border-outline-variant/15 text-outline hover:text-error'
                        }`}
                      >
                        {removeTalkId === t.id ? '再点一次删除' : '删除'}
                      </button>
                    </div>
                    <p className="text-on-surface text-sm font-light leading-relaxed whitespace-pre-line line-clamp-6">{t.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon="chat_bubble_outline" title="还没有留下的心里话" action="chat_bubble" actionLabel="去聊聊" to="/talk" />
            )}
          </section>
        )}

        {/* ── Tab: 收藏 ── */}
        {activeTab === 3 && (
          <section className="animate-fade-in">
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="bg-surface-container-low p-4 rounded-xl h-20 animate-pulse" />)}
              </div>
            ) : favorites.length > 0 ? (
              <div className="space-y-3">
                {favorites.map((fav, i) => {
                  const entry = ALL_ENTRIES.find(e => e.zh === fav.entry_zh)
                  return (
                    <div key={i}
                      className="bg-surface-container-lowest rounded-2xl p-5 flex items-start gap-4 border border-outline-variant/10"
                      style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl font-medium text-on-surface mb-0.5">{fav.entry_zh}</h3>
                        {entry && (
                          <>
                            <p className="text-on-surface-variant/60 text-xs italic mb-2">{entry.en}</p>
                            <p className="text-on-surface-variant text-sm font-light leading-relaxed line-clamp-2">{entry.desc}</p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeFavorite(fav.entry_zh)}
                        aria-label={`取消收藏 ${fav.entry_zh}`}
                        className="flex-shrink-0 text-outline-variant hover:text-secondary transition-colors duration-300 active:scale-90 mt-0.5 p-1 -m-1"
                      >
                        <span className="material-symbols-outlined text-xl"
                          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                          bookmark
                        </span>
                      </button>
                    </div>
                  )
                })}
                <div className="pt-4 flex justify-center">
                  <Link to="/dictionary"
                    className="inline-flex items-center gap-1.5 pl-4 pr-5 py-2.5 rounded-full bg-surface-container-low border border-outline-variant/15 text-on-surface-variant text-sm font-light transition-all duration-300 hover:border-primary/40 hover:text-primary active:scale-95">
                    <span className="material-symbols-outlined text-base text-primary">add</span>
                    去词典添加更多收藏
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState icon="menu_book" title="还没有收藏的词条" action="menu_book" actionLabel="去心理词典看看" to="/dictionary" />
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

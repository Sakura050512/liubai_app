import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../hooks/useDarkMode'
import BottomNav from '../components/BottomNav'

const TABS = ['概览', '情绪', '收藏']

const AVATARS = ['🌿', '🌸', '🍃', '🌊', '☁️', '🌙', '⭐', '🦋', '🌻', '🍀', '🌈', '🪷', '🫧', '🕊️', '🐚', '🌾']

const ALL_ENTRIES = {
  '冒名顶替综合症': { en: 'Impostor Syndrome', desc: '一种觉得自己的成就是靠运气、随时会被人看穿的感觉。' },
  '情绪颗粒度': { en: 'Emotional Granularity', desc: '精确区分和描述自己情绪细节的能力。' },
  '边界感': { en: 'Psychological Boundaries', desc: '对自我与他人关系的清晰认知。' },
  '过度共情': { en: 'Empathy Fatigue', desc: '长期吸收他人的痛苦而导致的情感耗竭状态。' },
  '反刍思维': { en: 'Rumination', desc: '反复回想过去的负面事件或问题，无法从中解脱。' },
  '心理韧性': { en: 'Resilience', desc: '在逆境、创伤或压力后能够恢复、适应甚至成长的能力。' },
  '依恋焦虑': { en: 'Attachment Anxiety', desc: '对亲密关系中被抛弃的强烈恐惧。' },
  '认知失调': { en: 'Cognitive Dissonance', desc: '当一个人持有两种相互矛盾的信念时产生的心理不适感。' },
  '习得性无助': { en: 'Learned Helplessness', desc: '经历多次失败后，即使成功有可能也不再尝试的心理状态。' },
  '高敏感人格': { en: 'Highly Sensitive Person', desc: '对外界刺激有比常人更深度的感知和处理。' },
  '焦虑性依附': { en: 'Anxious Attachment', desc: '在亲密关系中持续担心被忽视或抛弃。' },
  '自我效能感': { en: 'Self-Efficacy', desc: '对自己完成特定任务或应对挑战能力的信念。' },
}

const moodColors = {
  '平静': '#48654a', '低落': '#7e5731', '焦虑': '#9e422c',
  '愉悦': '#496553', '烦躁': '#704b26',
}

export default function Me() {
  const [isDark, setIsDark] = useDarkMode()
  const [avatar, setAvatar] = useState(() => localStorage.getItem('liubai-avatar') || '🌿')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [profile, setProfile] = useState({ nickname: '旅行者' })
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState({ moods: 0, journals: 0, talks: 0 })
  const [recentJournals, setRecentJournals] = useState([])
  const [moodHistory, setMoodHistory] = useState([])
  const [favorites, setFavorites] = useState([])
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

      const [moodRes, journalRes, talkRes, moodHistRes, journalListRes, favRes] = await Promise.all([
        supabase.from('mood_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('journal_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('talk_records').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('mood_records').select('mood, emoji, created_at, note').eq('user_id', user.id).order('created_at', { ascending: false }).limit(14),
        supabase.from('journal_entries').select('content, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('dictionary_favorites').select('entry_zh, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      setStats({ moods: moodRes.count || 0, journals: journalRes.count || 0, talks: talkRes.count || 0 })
      setMoodHistory(moodHistRes.data || [])
      setRecentJournals(journalListRes.data || [])
      setFavorites(favRes.data || [])
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowAbout(false)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-3xl p-8 pb-12 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-outline-variant/30 rounded-full mx-auto mb-8" />
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center text-4xl">
                🌿
              </div>
              <div>
                <h2 className="font-headline text-2xl font-light text-on-surface tracking-widest mb-1">留白</h2>
                <p className="text-outline text-xs tracking-widest">v1.0 · 心灵的数字庇护所</p>
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

      <header className="fixed top-0 w-full z-40 bg-surface flex items-center justify-between px-6"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(64px + env(safe-area-inset-top))' }}>
        <button
          onClick={handleSignOut}
          className="text-outline hover:text-primary transition-colors duration-300"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
        <h1 className="font-headline text-lg font-light tracking-widest text-primary">留白</h1>
        <div className="w-8 h-8 rounded-full bg-primary-container/50 flex items-center justify-center text-lg">
          {avatar}
        </div>
      </header>

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
              className="font-headline text-2xl font-light tracking-tight text-on-surface mb-1 bg-transparent border-b border-primary focus:ring-0 pb-1 w-48 outline-none"
              value={profile.nickname}
              onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))}
              onBlur={saveNickname}
              onKeyDown={e => e.key === 'Enter' && saveNickname()}
              autoFocus
            />
          ) : (
            <h2
              className="font-headline text-2xl font-light tracking-tight text-on-surface mb-1 cursor-pointer hover:text-primary transition-colors duration-300 flex items-center gap-2"
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
              {[0,1,2].map(i => <div key={i} className="bg-surface-container-lowest p-4 rounded-xl h-24 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {statCards.map(s => (
                <div key={s.label}
                  className="bg-surface-container-lowest p-4 rounded-xl flex flex-col items-start gap-2"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}
                >
                  <span className={`material-symbols-outlined ${s.color} p-1.5 ${s.bg} rounded-full text-lg`}>
                    {s.icon}
                  </span>
                  <div>
                    <p className={`text-2xl font-medium ${s.accent} font-headline leading-none`}>{s.value}</p>
                    <p className="text-on-surface-variant text-[11px] font-light mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 bg-surface-container-low rounded-xl p-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
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
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-outline">
                    {isDark ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span className="text-on-surface font-light">{isDark ? '深色模式' : '浅色模式'}</span>
                </div>
                <button
                  onClick={() => setIsDark(!isDark)}
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
                <button className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors duration-300">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">lock</span>
                    <span className="text-on-surface font-light">隐私设置</span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant text-sm">chevron_right</span>
                </button>
                <button className="group w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container-low transition-colors duration-300">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">notifications</span>
                    <span className="text-on-surface font-light">提醒</span>
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
                <div className="bg-surface-container-lowest rounded-2xl p-5 mb-4"
                  style={{ boxShadow: '0 4px 24px rgba(49,51,47,0.04)' }}>
                  <p className="text-[11px] text-outline uppercase tracking-widest mb-4">情绪分布（近 14 次）</p>
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
                  {moodHistory.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 bg-surface-container-low px-4 py-3 rounded-xl">
                      <span className="text-xl flex-shrink-0 mt-0.5">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-on-surface text-sm font-light">{m.mood}</p>
                        {m.note && (
                          <p className="text-on-surface-variant text-xs font-light mt-0.5 leading-relaxed line-clamp-2">{m.note}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-outline tracking-wide shrink-0 mt-0.5">
                        {new Date(m.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  ))}
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

        {/* ── Tab: 收藏 ── */}
        {activeTab === 2 && (
          <section className="animate-fade-in">
            {loading ? (
              <div className="space-y-3">
                {[0,1,2].map(i => <div key={i} className="bg-surface-container-low p-4 rounded-xl h-20 animate-pulse" />)}
              </div>
            ) : favorites.length > 0 ? (
              <div className="space-y-3">
                {favorites.map((fav, i) => {
                  const entry = ALL_ENTRIES[fav.entry_zh]
                  return (
                    <div key={i}
                      className="bg-surface-container-lowest rounded-xl p-5 flex items-start gap-4"
                      style={{ boxShadow: '0 2px 16px rgba(49,51,47,0.04)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-headline text-base font-medium text-on-surface mb-0.5">{fav.entry_zh}</h3>
                        {entry && (
                          <>
                            <p className="text-on-surface-variant/60 text-xs italic mb-2">{entry.en}</p>
                            <p className="text-on-surface-variant text-sm font-light leading-relaxed line-clamp-2">{entry.desc}</p>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeFavorite(fav.entry_zh)}
                        className="flex-shrink-0 text-outline-variant hover:text-secondary transition-colors duration-300 active:scale-90 mt-0.5"
                      >
                        <span className="material-symbols-outlined text-xl"
                          style={{ fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}>
                          bookmark
                        </span>
                      </button>
                    </div>
                  )
                })}
                <div className="pt-2 text-center">
                  <Link to="/dictionary"
                    className="text-primary text-sm font-light hover:opacity-70 transition-opacity flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">add</span>
                    去词典添加更多收藏
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-outline-variant text-4xl block mb-3">bookmark_border</span>
                <p className="text-on-surface-variant text-sm font-light mb-4">还没有收藏的词条</p>
                <Link to="/dictionary"
                  className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95">
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  去心理词典看看
                </Link>
              </div>
            )}
          </section>
        )}

        <p className="text-center text-xs text-outline-variant/50 tracking-widest py-8">
          留白 · v1.0 · 心灵的数字庇护所
        </p>
      </main>

      <BottomNav />
    </div>
  )
}

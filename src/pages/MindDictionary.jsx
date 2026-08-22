import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ALL_ENTRIES } from '../data/dictionary'
import TopBar from '../components/TopBar'

export default function MindDictionary() {
  const location = useLocation()
  // 支持从首页"今日词条"直达（state.entryIndex）；普通进入从第 0 条开始
  const [index, setIndex] = useState(() => location.state?.entryIndex ?? 0)
  const [phase, setPhase] = useState('idle')
  const [slideDir, setSlideDir] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [favorites, setFavorites] = useState(new Set())
  const [favLoading, setFavLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const lockRef = useRef(false)
  const toastTimer = useRef(null)

  // 加载收藏列表
  useEffect(() => {
    const loadFavs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('dictionary_favorites')
        .select('entry_zh')
        .eq('user_id', user.id)
      if (data) setFavorites(new Set(data.map(d => d.entry_zh)))
    }
    loadFavs()
  }, [])

  const showToast = (msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2000)
  }

  const toggleFavorite = async (entryZh) => {
    if (favLoading) return
    setFavLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFavLoading(false); return }

    const isFaved = favorites.has(entryZh)

    if (isFaved) {
      await supabase
        .from('dictionary_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('entry_zh', entryZh)
      setFavorites(prev => {
        const next = new Set(prev)
        next.delete(entryZh)
        return next
      })
      showToast('已取消收藏')
    } else {
      await supabase
        .from('dictionary_favorites')
        .insert({ user_id: user.id, entry_zh: entryZh })
      setFavorites(prev => new Set([...prev, entryZh]))
      showToast('已收藏 ✓')
    }

    setFavLoading(false)
  }

  const entries = searchText.trim()
    ? ALL_ENTRIES.filter(e =>
        e.zh.includes(searchText) ||
        e.en.toLowerCase().includes(searchText.toLowerCase()) ||
        e.desc.includes(searchText)
      )
    : ALL_ENTRIES

  const safeIndex = Math.min(index, Math.max(entries.length - 1, 0))
  const entry = entries[safeIndex] || ALL_ENTRIES[0]
  const isFaved = favorites.has(entry.zh)

  const go = (d) => {
    if (lockRef.current || entries.length <= 1) return
    lockRef.current = true
    setSlideDir(d)
    setPhase('out')
    setTimeout(() => {
      setIndex(i => (i + d + entries.length) % entries.length)
      setPhase('in')
      setTimeout(() => {
        setPhase('idle')
        lockRef.current = false
      }, 300)
    }, 300)
  }

  const cardStyle = (() => {
    if (phase === 'out') return { opacity: 0, transform: `translateX(${-slideDir * 32}px)` }
    if (phase === 'in') return { opacity: 0, transform: `translateX(${slideDir * 32}px)` }
    return { opacity: 1, transform: 'translateX(0)' }
  })()

  // 导航圆点窗口化：词条多时只显示首尾 + 当前附近，避免 42 个圆点
  const dotIndices = (() => {
    const total = entries.length
    if (total <= 9) return Array.from({ length: total }, (_, i) => i)
    const cur = safeIndex
    const set = new Set([0, total - 1, cur - 1, cur, cur + 1])
    const arr = [...set].filter(i => i >= 0 && i < total).sort((a, b) => a - b)
    const out = []
    let prev = -1 // -1 保证索引 0 前不产生前导省略号
    for (const i of arr) {
      if (i - prev > 1) out.push('gap')
      out.push(i)
      prev = i
    }
    return out
  })()

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col">
      <TopBar
        title="心理词典"
        back
        backTo="/"
        right={
          <button
            onClick={() => { setShowSearch(!showSearch); setSearchText('') }}
            className="text-primary hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined">
              {showSearch ? 'close' : 'search'}
            </span>
          </button>
        }
      />

      {/* 搜索栏 */}
      {showSearch && (
        <div className="fixed top-0 left-0 right-0 z-40 px-6 py-3 bg-surface border-b border-outline-variant/10 app-topbar"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 68px)' }}>
          <label htmlFor="dict-search" className="sr-only">搜索词条</label>
          <input
            id="dict-search"
            autoFocus
            className="w-full bg-surface-container-low rounded-2xl px-4 py-2.5 text-on-surface placeholder-outline text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            placeholder="搜索词条名称或描述..."
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setIndex(0) }}
          />
          {searchText && (
            <p className="text-[11px] text-outline mt-2 pl-1">
              找到 {entries.length} 个结果
            </p>
          )}
        </div>
      )}

      {/* Toast 提示 */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 text-sm font-light px-5 py-2.5 rounded-full animate-fade-in shadow-lift"
          style={{ backgroundColor: 'rgba(35, 37, 33, 0.92)', color: '#fcf9f6' }}
        >
          {toastMsg}
        </div>
      )}

      <main
        className={`flex-grow pb-16 px-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full`}
        style={{ paddingTop: showSearch ? 'calc(112px + env(safe-area-inset-top))' : 'calc(80px + env(safe-area-inset-top))' }}
      >
        {entries.length === 0 ? (
          <div className="text-center space-y-4">
            <span className="material-symbols-outlined text-outline-variant text-5xl block">search_off</span>
            <p className="text-on-surface-variant font-light">没有找到相关词条</p>
            <button
              onClick={() => setSearchText('')}
              className="text-primary text-sm font-light hover:opacity-70 transition-opacity"
            >
              清除搜索
            </button>
          </div>
        ) : (
          <>
            {/* Card Stack */}
            <div className="relative w-full max-w-md mb-10" style={{ aspectRatio: '3/4' }}>
              {/* 背景装饰卡 */}
              <div className="absolute inset-0 bg-surface-container-lowest rounded-[2rem] ambient-shadow translate-y-4 scale-90 opacity-40 origin-bottom" />
              <div className="absolute inset-0 bg-surface-container-lowest rounded-[2rem] ambient-shadow translate-y-2 scale-95 opacity-70 origin-bottom" />

              {/* 主卡片 */}
              <div
                className="absolute inset-0 bg-surface-container-lowest rounded-[2rem] card-shadow p-8 flex flex-col border border-outline-variant/10"
                style={{
                  ...cardStyle,
                  transition: 'opacity 300ms ease, transform 300ms ease',
                  willChange: 'opacity, transform',
                }}
              >
                {/* 顶部：标签 + 计数 + 收藏按钮 */}
                <div className="mb-8 flex items-center justify-between">
                  <span className="inline-block px-3 py-1 bg-primary-container text-on-primary-container text-[10px] font-medium tracking-widest uppercase rounded-full">
                    词条
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-outline-variant">
                      {safeIndex + 1} / {entries.length}
                    </span>
                    <button
                      onClick={() => toggleFavorite(entry.zh)}
                      disabled={favLoading}
                      aria-pressed={isFaved}
                      aria-label={isFaved ? `取消收藏 ${entry.zh}` : `收藏 ${entry.zh}`}
                      className="transition-all duration-300 active:scale-90 disabled:opacity-50 p-1 -m-1"
                    >
                      <span
                        className={`material-symbols-outlined text-2xl transition-colors duration-300 ${
                          isFaved ? 'text-secondary' : 'text-outline-variant hover:text-secondary'
                        }`}
                        style={isFaved
                          ? { fontVariationSettings: "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24" }
                          : {}
                        }
                      >
                        bookmark
                      </span>
                    </button>
                  </div>
                </div>

                {/* 词条名称 */}
                <div className="space-y-2 mb-8">
                  <h2 className="font-display text-4xl font-medium text-on-surface tracking-tight">
                    {entry.zh}
                  </h2>
                  <p className="text-on-surface-variant font-light text-lg italic opacity-60">
                    {entry.en}
                  </p>
                </div>

                <div className="w-full h-px bg-outline-variant/20 mb-8" />

                {/* 释义 */}
                <div className="flex-grow">
                  <p className="text-on-surface-variant text-lg leading-relaxed font-light">
                    {entry.desc}
                  </p>
                </div>

                {/* 底部来源 */}
                <div className="mt-auto pt-6">
                  <p className="text-[11px] text-outline tracking-widest uppercase font-medium opacity-80">
                    词条来源：{entry.source}
                  </p>
                </div>
              </div>
            </div>

            {/* 进度点（窗口化显示） */}
            {!searchText && (
              <div className="flex gap-2 mb-8 flex-wrap justify-center items-center max-w-[200px]">
                {dotIndices.map((d, i) => (
                  d === 'gap' ? (
                    <span key={`g${i}`} className="text-outline-variant text-xs select-none leading-none">···</span>
                  ) : (
                    <button
                      key={d}
                      onClick={() => !lockRef.current && setIndex(d)}
                      aria-label={`第 ${d + 1} 条`}
                      className={`rounded-full transition-all duration-300 ${
                        d === safeIndex ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-outline-variant/40'
                      }`}
                    />
                  )
                ))}
              </div>
            )}

            {/* CTA */}
            <Link
              to="/talk"
              className="w-full max-w-xs h-14 bg-primary-container text-on-primary-container rounded-full font-medium tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all duration-300 mb-10 shadow-glow-soft"
            >
              <span>我也有这种感受</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            {/* 翻页导航 */}
            <div className="flex items-center gap-3 select-none">
              <button
                onClick={() => go(-1)}
                disabled={entries.length <= 1}
                className="group flex items-center gap-1.5 pl-3 pr-5 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant text-[11px] tracking-[0.2em] uppercase transition-all duration-300 hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                style={{ boxShadow: '0 2px 12px rgba(49,51,47,0.04)' }}
              >
                <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:-translate-x-0.5">chevron_left</span>
                上一条
              </button>
              <span className="w-1 h-1 rounded-full bg-outline-variant/40 flex-shrink-0" />
              <button
                onClick={() => go(1)}
                disabled={entries.length <= 1}
                className="group flex items-center gap-1.5 pl-5 pr-3 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/15 text-on-surface-variant text-[11px] tracking-[0.2em] uppercase transition-all duration-300 hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                style={{ boxShadow: '0 2px 12px rgba(49,51,47,0.04)' }}
              >
                下一条
                <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-0.5">chevron_right</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
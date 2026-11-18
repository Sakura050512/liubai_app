import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from './lib/supabase'
import { ThemeProvider } from './context/ThemeContext'

// 路由级懒加载：首屏只加载当前页面代码，其余按需下载
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Auth = lazy(() => import('./pages/Auth'))
const Home = lazy(() => import('./pages/Home'))
const MindDictionary = lazy(() => import('./pages/MindDictionary'))
const Talk = lazy(() => import('./pages/Talk'))
const DailyJournal = lazy(() => import('./pages/DailyJournal'))
const Me = lazy(() => import('./pages/Me'))
const Breathing = lazy(() => import('./pages/Breathing'))
const WeeklyReport = lazy(() => import('./pages/WeeklyReport'))
const MoodGarden = lazy(() => import('./pages/MoodGarden'))
const Sound = lazy(() => import('./pages/Sound'))
const Explore = lazy(() => import('./pages/Explore'))

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

// 栈底返回提示（不依赖路由，onboarding/加载态也能用）
function showExitToast() {
  let el = document.getElementById('liubai-exit-toast')
  if (!el) {
    el = document.createElement('div')
    el.id = 'liubai-exit-toast'
    el.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9999;padding:10px 20px;border-radius:999px;background:rgba(38,41,35,.92);color:#fff;font-size:14px;letter-spacing:.05em;pointer-events:none;transition:opacity .25s;white-space:nowrap'
    document.body.appendChild(el)
  }
  el.textContent = '再按一次退出'
  el.style.opacity = '1'
  clearTimeout(el._t)
  el._t = setTimeout(() => { el.style.opacity = '0' }, 1600)
}

// 栈底返回：2 秒内连按两次才退出，避免误触
function doubleTapExit(stateRef) {
  const now = Date.now()
  if (now - stateRef.current.lastBack < 2000) {
    CapacitorApp.exitApp()
  } else {
    stateRef.current.lastBack = now
    showExitToast()
  }
}

function AppInner() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const backStateRef = useRef({ lastBack: 0, goBack: null })

  // Android 返回键/侧滑手势：交给 JS 决定回退还是退出
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let handle = null
    let alive = true
    CapacitorApp.addListener('backButton', () => {
      if (!alive) return
      // 路由内守卫提供精确回退；onboarding/加载态用它自己的兜底（双击退出）
      if (backStateRef.current.goBack) backStateRef.current.goBack()
      else doubleTapExit(backStateRef)
    }).then(h => { if (alive) handle = h })
    return () => { alive = false; handle?.remove?.() }
  }, [])

  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      // 检查是否需要 onboarding
      const onboarded = localStorage.getItem('liubai-onboarded')
      if (!onboarded && mounted) {
        setShowOnboarding(true)
      }

      // 获取session
      const { data: { session } } = await supabase.auth.getSession()
      if (mounted) {
        setSession(session)
        setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 新用户 onboarding
  if (showOnboarding) {
    return (
      <Suspense fallback={<Splash />}>
        <Onboarding onDone={() => setShowOnboarding(false)} />
      </Suspense>
    )
  }

  // 加载中
  if (loading) {
    return <Splash />
  }

  return (
    <HashRouter>
      <BackGuard backStateRef={backStateRef} />
      <div className="relative w-full bg-surface" style={{ height: '100dvh', overflowX: 'hidden' }}>
        <Suspense fallback={<Splash />}>
          <Routes>
          {!session ? (
            <>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/dictionary" element={<MindDictionary />} />
              <Route path="/talk" element={<Talk />} />
              <Route path="/journal" element={<DailyJournal />} />
              <Route path="/me" element={<Me />} />
              <Route path="/breathing" element={<Breathing />} />
              <Route path="/weekly" element={<WeeklyReport />} />
              <Route path="/garden" element={<MoodGarden />} />
              <Route path="/sound" element={<Sound />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
          </Routes>
        </Suspense>
      </div>
    </HashRouter>
  )
}

// 路由内守卫：登记"如何回退"给 backButton 监听器。
// 用 history.state.idx（react-router 的索引）判断能否回退：idx>0 说明栈里有上一级。
function BackGuard({ backStateRef }) {
  const navigate = useNavigate()

  const goBack = () => {
    const idx = window.history.state?.idx ?? 0
    if (idx > 0) {
      navigate(-1)
    } else {
      doubleTapExit(backStateRef)
    }
  }

  useEffect(() => {
    backStateRef.current.goBack = goBack
    return () => { backStateRef.current.goBack = null }
  })

  return null
}

// 启动/路由切换时的加载画面
function Splash() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center font-headline">
      <p className="text-3xl font-light text-primary tracking-widest animate-fade-in">留白</p>
    </div>
  )
}
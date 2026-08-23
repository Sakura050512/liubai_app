import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}

function AppInner() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

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

// 启动/路由切换时的加载画面
function Splash() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center font-headline">
      <p className="text-3xl font-light text-primary tracking-widest animate-fade-in">留白</p>
    </div>
  )
}
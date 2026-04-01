import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useDarkMode } from './hooks/useDarkMode'
import Onboarding from './pages/Onboarding'
import Auth from './pages/Auth'
import Home from './pages/Home'
import MindDictionary from './pages/MindDictionary'
import NameMyFeeling from './pages/NameMyFeeling'
import JustWantToTalk from './pages/JustWantToTalk'
import DailyJournal from './pages/DailyJournal'
import Me from './pages/Me'
import Breathing from './pages/Breathing'
import WeeklyReport from './pages/WeeklyReport'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  useDarkMode() // 初始化深色模式

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
    return <Onboarding onDone={() => setShowOnboarding(false)} />
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center font-headline">
        <p className="text-3xl font-light text-primary tracking-widest animate-fade-in">留白</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="relative w-full bg-surface" style={{ height: '100dvh', overflowX: 'hidden' }}>
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
              <Route path="/feeling" element={<NameMyFeeling />} />
              <Route path="/talk" element={<JustWantToTalk />} />
              <Route path="/journal" element={<DailyJournal />} />
              <Route path="/me" element={<Me />} />
              <Route path="/breathing" element={<Breathing />} />
              <Route path="/weekly" element={<WeeklyReport />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  )
}
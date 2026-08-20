import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('error')

  const handle = async () => {
    setMsg('')
    if (!email) { setMsg('请填写邮箱'); setMsgType('error'); return }

    if (mode === 'reset') {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      })
      setMsg(error ? '发送失败，请检查邮箱是否正确' : '重置链接已发送，请查收邮件')
      setMsgType(error ? 'error' : 'success')
      setLoading(false)
      return
    }

    if (!password) { setMsg('请填写密码'); setMsgType('error'); return }
    if (password.length < 6) { setMsg('密码至少需要 6 位'); setMsgType('error'); return }

    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMsg('邮箱或密码错误'); setMsgType('error') }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMsg(error.message.includes('already registered') ? '该邮箱已注册，请直接登录' : error.message)
        setMsgType('error')
      }
    }
    setLoading(false)
  }

  const switchMode = (m) => { setMode(m); setMsg('') }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 font-body relative overflow-hidden">
      {/* 背景氛围光晕 */}
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary-container/40 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full bg-secondary-container/30 blur-3xl" />

      <div className="relative mb-12 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary-container mb-5 shadow-glow-soft">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 40" }}>self_improvement</span>
        </div>
        <h1 className="font-display text-4xl font-medium text-primary mb-2 tracking-wide">留白</h1>
        <p className="text-on-surface-variant text-sm font-light tracking-[0.2em]">心灵的数字庇护所</p>
      </div>

      <div className="w-full max-w-sm space-y-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <div>
          <label htmlFor="auth-email" className="sr-only">邮箱</label>
          <input
            id="auth-email"
            type="email" placeholder="邮箱"
            autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            className="w-full bg-surface-container-lowest rounded-2xl px-4 py-3.5 text-on-surface placeholder-outline text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 transition-all"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label htmlFor="auth-password" className="sr-only">密码</label>
            <input
              id="auth-password"
              type="password" placeholder="密码（至少 6 位）"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              className="w-full bg-surface-container-lowest rounded-2xl px-4 py-3.5 text-on-surface placeholder-outline text-sm font-light focus:outline-none focus:ring-2 focus:ring-primary/30 border border-outline-variant/20 transition-all"
            />
          </div>
        )}

        {msg && (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm text-center px-2 animate-fade-in ${msgType === 'error' ? 'text-error' : 'text-primary'}`}
          >
            {msg}
          </p>
        )}

        <button onClick={handle} disabled={loading}
          className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-medium tracking-wide transition-all duration-300 active:scale-[0.98] disabled:opacity-50 shadow-glow">
          {loading ? '处理中...' : mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置邮件'}
        </button>

        {/* 模式切换 */}
        <div className="flex flex-col gap-1 pt-2">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('register')}
                className="w-full text-center text-sm text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors py-1.5">
                没有账号？点此注册
              </button>
              <button onClick={() => switchMode('reset')}
                className="w-full text-center text-sm text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors py-1.5">
                忘记密码？
              </button>
            </>
          )}
          {mode === 'register' && (
            <button onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors py-1.5">
              已有账号？点此登录
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors py-1.5">
              返回登录
            </button>
          )}
        </div>
      </div>

      <p className="absolute bottom-8 text-[11px] text-outline-variant text-center tracking-wide">
        你的数据只属于你自己
      </p>
    </div>
  )
}

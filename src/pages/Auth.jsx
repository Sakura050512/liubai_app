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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 font-body">
      <div className="mb-12 text-center">
        <h1 className="font-headline text-4xl font-light text-primary mb-2 tracking-widest">留白</h1>
        <p className="text-on-surface-variant text-sm font-light tracking-wide">心灵的数字庇护所</p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <input
          type="email" placeholder="邮箱"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder-outline text-sm font-light focus:outline-none focus:ring-1 focus:ring-primary transition-all"
        />

        {mode !== 'reset' && (
          <input
            type="password" placeholder="密码（至少 6 位）"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 text-on-surface placeholder-outline text-sm font-light focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        )}

        {msg && (
          <p className={`text-sm text-center px-2 ${msgType === 'error' ? 'text-error' : 'text-primary'}`}>
            {msg}
          </p>
        )}

        <button onClick={handle} disabled={loading}
          className="w-full bg-primary text-on-primary py-3.5 rounded-full font-medium tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50">
          {loading ? '处理中...' : mode === 'login' ? '登录' : mode === 'register' ? '注册' : '发送重置邮件'}
        </button>

        {/* 模式切换 */}
        <div className="flex flex-col gap-1 pt-1">
          {mode === 'login' && (
            <>
              <button onClick={() => switchMode('register')}
                className="w-full text-center text-sm text-outline hover:text-primary transition-colors py-1.5">
                没有账号？点此注册
              </button>
              <button onClick={() => switchMode('reset')}
                className="w-full text-center text-sm text-outline hover:text-primary transition-colors py-1.5">
                忘记密码？
              </button>
            </>
          )}
          {mode === 'register' && (
            <button onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-outline hover:text-primary transition-colors py-1.5">
              已有账号？点此登录
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => switchMode('login')}
              className="w-full text-center text-sm text-outline hover:text-primary transition-colors py-1.5">
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
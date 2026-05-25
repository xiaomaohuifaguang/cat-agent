import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-body)' }}>
      {/* 左侧品牌区 */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-center px-20 relative overflow-hidden"
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* 背景装饰纹理 */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--accent-color)' }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[30rem] h-[30rem] rounded-full opacity-5"
          style={{ background: 'var(--accent-color)' }}
        />

        <div className="relative z-10">
          <h1
            className="text-7xl font-bold tracking-tight mb-6"
            style={{ color: 'var(--text-on-dark)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}
          >
            CatAgent
          </h1>
          <p
            className="text-xl max-w-md leading-relaxed"
            style={{ color: 'var(--text-on-dark)', opacity: 0.7, fontFamily: 'var(--font-body)' }}
          >
            智能代理管理系统
            <br />
            简洁、高效、可信赖
          </p>
          <div
            className="mt-12 w-16 h-[2px]"
            style={{ background: 'var(--accent-color)' }}
          />
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* 移动端标题 */}
        <div className="lg:hidden absolute top-12 left-0 right-0 text-center">
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            CatAgent
          </h1>
        </div>

        <div
          className="w-full max-w-sm"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div className="p-8">
            <div className="mb-8">
              <h2
                className="text-2xl font-semibold mb-2"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                欢迎回来
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                请输入您的账户信息以继续
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="请输入用户名"
                  className="block w-full px-4 py-3 outline-none transition"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入密码"
                  className="block w-full px-4 py-3 outline-none transition"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-body)',
                  }}
                />
              </div>
              {error && (
                <p className="text-sm py-2 px-3 rounded" style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent-color)',
                  color: 'var(--accent-text)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                }}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

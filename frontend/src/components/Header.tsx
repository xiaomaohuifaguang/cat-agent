import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMeApi } from '../api/client'
import { useAuthStore } from '../store/auth'
import { useTheme } from '../context/ThemeContext'
import ConfirmDialog from './ConfirmDialog'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme, isDark, toggleDark } = useTheme()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: username } = useQuery({
    queryKey: ['me'],
    queryFn: getMeApi,
  })

  const handleLogout = () => {
    setConfirmOpen(true)
  }

  const handleConfirmLogout = () => {
    setConfirmOpen(false)
    logout()
  }

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-8 sticky top-0 z-10"
        style={{
          background: 'var(--bg-header)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'brutalist' | 'soft' | 'industrial' | 'cyberpunk')}
            className="text-sm px-2 py-1 outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <option value="brutalist">粗野</option>
            <option value="soft">温润</option>
            <option value="industrial">工业</option>
            <option value="cyberpunk">赛博朋克</option>
          </select>
          <button
            onClick={toggleDark}
            className="text-sm px-3 py-1 transition"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* 用户区域：用户名 + 退出登录 */}
          <div
            className="flex items-center gap-2"
            style={{
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '12px',
            }}
          >
            {username && (
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                {username}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 transition"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-body)',
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={confirmOpen}
        title="退出登录"
        content="确定要退出登录吗？"
        confirmText="退出"
        cancelText="取消"
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
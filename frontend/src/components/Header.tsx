import { useAuthStore } from '../store/auth'
import { useTheme } from '../context/ThemeContext'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme, isDark, toggleDark } = useTheme()

  return (
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
          onChange={(e) => setTheme(e.target.value as ThemeName)}
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
        <button
          onClick={logout}
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
    </header>
  )
}

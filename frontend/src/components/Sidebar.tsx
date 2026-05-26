import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside
      className="w-64 flex flex-col fixed h-full left-0 top-0"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        className="h-16 flex items-center px-6"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <h1 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-on-dark)' }}>
          CatAgent
        </h1>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/models"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              模型管理
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              用途配置
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const modelSubItems = [
  { to: '/models', label: '模型管理' },
  { to: '/settings', label: '用途配置' },
]

export default function Sidebar() {
  const location = useLocation()
  const isModelActive = modelSubItems.some((item) => location.pathname === item.to)
  const [modelOpen, setModelOpen] = useState(isModelActive)

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
            <button
              onClick={() => setModelOpen(!modelOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm transition cursor-pointer"
              style={{
                borderRadius: 'var(--radius)',
                background: isModelActive && !modelOpen ? 'var(--accent-color)' : 'transparent',
                color: isModelActive && !modelOpen ? 'var(--accent-text)' : 'var(--text-on-dark)',
              }}
            >
              <span className={isModelActive ? 'font-semibold' : ''}>模型配置</span>
              <span
                className="text-xs transition-transform"
                style={{ transform: modelOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                &#9654;
              </span>
            </button>
            {modelOpen && (
              <ul className="mt-1 space-y-1 pl-3">
                {modelSubItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm transition ${isActive ? 'font-semibold' : ''}`
                      }
                      style={({ isActive }) => ({
                        borderRadius: 'var(--radius)',
                        background: isActive ? 'var(--accent-color)' : 'transparent',
                        color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
                      })}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  )
}

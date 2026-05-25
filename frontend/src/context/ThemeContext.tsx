import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeName = 'brutalist' | 'soft' | 'industrial' | 'cyberpunk'

interface ThemeContextType {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  isDark: boolean
  toggleDark: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const getInitialTheme = (): ThemeName => {
  const saved = localStorage.getItem('catagent-theme') as ThemeName | null
  if (saved && ['brutalist', 'soft', 'industrial', 'cyberpunk'].includes(saved)) return saved
  return 'brutalist'
}

const getInitialDark = (): boolean => {
  const saved = localStorage.getItem('catagent-dark')
  if (saved !== null) return saved === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(getInitialTheme)
  const [isDark, setIsDark] = useState<boolean>(getInitialDark)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-dark', String(isDark))
  }, [theme, isDark])

  const setTheme = (t: ThemeName) => {
    setThemeState(t)
    localStorage.setItem('catagent-theme', t)
  }

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem('catagent-dark', String(next))
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

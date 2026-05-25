import { create } from 'zustand'
import { loginApi } from '../api/client'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username: string, password: string) => {
    const token = await loginApi(username, password)
    localStorage.setItem('token', token)
    set({ token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, isAuthenticated: false })
  },
}))
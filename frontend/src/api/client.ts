import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function loginApi(username: string, password: string) {
  const res = await apiClient.post('/api/v1/auth/login', { username, password })
  return res.data.token as string
}

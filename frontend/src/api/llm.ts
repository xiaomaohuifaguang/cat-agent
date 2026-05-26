import { apiClient } from './client'

// ---------- Types ----------

export interface ProviderResponse {
  id: number
  name: string
  base_url: string
  model_name: string
  api_key_masked: string
  created_at: string
  updated_at: string
}

export interface ProviderCreate {
  name: string
  base_url: string
  model_name: string
  api_key: string
}

export interface ProviderUpdate {
  name?: string
  base_url?: string
  model_name?: string
  api_key?: string
}

export interface SettingResponse {
  id: number
  category: string
  provider_id: number
  provider: ProviderResponse
  created_at: string
  updated_at: string
}

export interface SettingCreate {
  category: string
  provider_id: number
}

export interface SettingUpdate {
  provider_id: number
}

// ---------- Provider API ----------

export async function listProviders() {
  const res = await apiClient.get('/api/v1/llm/providers')
  return res.data.data as ProviderResponse[]
}

export async function createProvider(data: ProviderCreate) {
  const res = await apiClient.post('/api/v1/llm/providers', data)
  return res.data.data as ProviderResponse
}

export async function updateProvider(id: number, data: ProviderUpdate) {
  const res = await apiClient.put(`/api/v1/llm/providers/${id}`, data)
  return res.data.data as ProviderResponse
}

export async function deleteProvider(id: number) {
  const res = await apiClient.delete(`/api/v1/llm/providers/${id}`)
  return res.data
}

// ---------- Setting API ----------

export async function listSettings() {
  const res = await apiClient.get('/api/v1/llm/settings')
  return res.data.data as SettingResponse[]
}

export async function createSetting(data: SettingCreate) {
  const res = await apiClient.post('/api/v1/llm/settings', data)
  return res.data.data as SettingResponse
}

export async function updateSetting(category: string, data: SettingUpdate) {
  const res = await apiClient.put(`/api/v1/llm/settings/${category}`, data)
  return res.data.data as SettingResponse
}

export async function deleteSetting(category: string) {
  const res = await apiClient.delete(`/api/v1/llm/settings/${category}`)
  return res.data
}

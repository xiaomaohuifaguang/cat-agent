import { apiClient } from './client'

export interface ApiKeyPermissionItem {
  endpoint: string
  method: string
  rate_limit: number
  quota: number
}

export interface ApiKeyPermissionResponse {
  id: number
  endpoint: string
  method: string
  rate_limit: number
  quota: number
  used_count: number
}

export interface ApiKeyCreate {
  name: string
  expires_at: string | null
  permissions: ApiKeyPermissionItem[]
}

export interface ApiKeyUpdate {
  name?: string
  status?: number
  expires_at?: string | null
  permissions?: ApiKeyPermissionItem[]
}

export interface ApiKeyResponse {
  id: number
  key: string
  name: string
  status: number
  expires_at: string | null
  created_at: string
  updated_at: string
  permissions: ApiKeyPermissionResponse[]
}

export interface ApiKeyListItem {
  id: number
  key: string
  name: string
  status: number
  expires_at: string | null
  created_at: string
}

export interface ApiKeyUsageLogItem {
  id: number
  endpoint: string
  method: string
  status_code: number
  created_at: string
}

export interface AvailableEndpoint {
  endpoint: string
  method: string
  label: string
}

export async function listAvailableEndpoints() {
  const res = await apiClient.get('/api/v1/api-keys/endpoints')
  return res.data.data as AvailableEndpoint[]
}

export async function listApiKeys() {
  const res = await apiClient.get('/api/v1/api-keys')
  return res.data.data as ApiKeyListItem[]
}

export async function createApiKey(data: ApiKeyCreate) {
  const res = await apiClient.post('/api/v1/api-keys', data)
  return res.data.data as ApiKeyResponse
}

export async function getApiKey(id: number) {
  const res = await apiClient.get(`/api/v1/api-keys/${id}`)
  return res.data.data as ApiKeyResponse
}

export async function updateApiKey(id: number, data: ApiKeyUpdate) {
  const res = await apiClient.put(`/api/v1/api-keys/${id}`, data)
  return res.data.data as ApiKeyResponse
}

export async function deleteApiKey(id: number) {
  await apiClient.delete(`/api/v1/api-keys/${id}`)
}

export async function regenerateApiKey(id: number) {
  const res = await apiClient.post(`/api/v1/api-keys/${id}/regenerate`)
  return res.data.data.key as string
}

export async function listApiKeyLogs(id: number) {
  const res = await apiClient.get(`/api/v1/api-keys/${id}/logs`)
  return res.data.data as ApiKeyUsageLogItem[]
}

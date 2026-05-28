import { apiClient } from './client'

export interface ParseResponse {
  text: string
}

export async function parseDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post('/api/v1/documents/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data.data as ParseResponse
}

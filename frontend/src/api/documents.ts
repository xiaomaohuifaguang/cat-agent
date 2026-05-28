import { apiClient } from './client'

export interface PageItem {
  page: number
  text: string
}

export interface SheetItem {
  name: string
  text: string
}

export interface ParseResponse {
  text: string
  pages?: PageItem[]
  sheets?: SheetItem[]
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

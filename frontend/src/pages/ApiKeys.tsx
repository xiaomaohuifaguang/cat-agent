import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listApiKeys,
  createApiKey,
  getApiKey,
  updateApiKey,
  deleteApiKey,
  regenerateApiKey,
  listApiKeyLogs,
  listAvailableEndpoints,
  type ApiKeyListItem,
  type ApiKeyPermissionItem,
} from '../api/apiKeys'
import { useToastStore } from '../store/toast'

const boxStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
}

interface FormData {
  name: string
  expires_at: string
  permissions: ApiKeyPermissionItem[]
}

const emptyForm: FormData = {
  name: '',
  expires_at: '',
  permissions: [],
}

function formatDate(d: string | null) {
  if (!d) return '永不过期'
  const date = new Date(d)
  const now = new Date()
  if (date < now) return '已过期'
  return date.toLocaleString('zh-CN')
}

function maskKey(key: string) {
  if (key.length <= 16) return key
  return key.slice(0, 12) + '****' + key.slice(-4)
}

export default function ApiKeys() {
  const addToast = useToastStore((s) => s.addToast)
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [logsModal, setLogsModal] = useState<{ open: boolean; keyId: number | null; keyName: string }>({
    open: false,
    keyId: null,
    keyName: '',
  })

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  })

  const { data: availableEndpoints } = useQuery({
    queryKey: ['api-key-endpoints'],
    queryFn: listAvailableEndpoints,
  })

  const createMut = useMutation({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setModalOpen(false)
      setForm(emptyForm)
      addToast('success', '创建成功')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '创建失败')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateApiKey(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setModalOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      addToast('success', '更新成功')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '更新失败')
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      addToast('success', '删除成功')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '删除失败')
    },
  })

  const regenerateMut = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      addToast('success', `新 Key 已生成: ${newKey.slice(0, 16)}...`)
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '重置失败')
    },
  })

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) {
      addToast('error', '请输入名称')
      return
    }
    const payload = {
      name: form.name.trim(),
      expires_at: form.expires_at || null,
      permissions: form.permissions,
    }
    if (editingId !== null) {
      updateMut.mutate({ id: editingId, data: payload })
    } else {
      createMut.mutate(payload)
    }
  }, [form, editingId, createMut, updateMut, addToast])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = async (key: ApiKeyListItem) => {
    try {
      const fullKey = await getApiKey(key.id)
      setEditingId(key.id)
      setForm({
        name: fullKey.name,
        expires_at: fullKey.expires_at ? fullKey.expires_at.slice(0, 16) : '',
        permissions: fullKey.permissions.map((p) => ({
          endpoint: p.endpoint,
          method: p.method,
          rate_limit: p.rate_limit,
          quota: p.quota,
        })),
      })
      setModalOpen(true)
    } catch (err: any) {
      addToast('error', err.response?.data?.message || '加载失败')
    }
  }

  const toggleEndpoint = (endpoint: string, method: string) => {
    const exists = form.permissions.find((p) => p.endpoint === endpoint && p.method === method)
    if (exists) {
      setForm((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !(p.endpoint === endpoint && p.method === method)),
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        permissions: [...prev.permissions, { endpoint, method, rate_limit: -1, quota: -1 }],
      }))
    }
  }

  const updatePermField = (endpoint: string, method: string, field: 'rate_limit' | 'quota', value: number) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) =>
        p.endpoint === endpoint && p.method === method ? { ...p, [field]: value } : p
      ),
    }))
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    addToast('success', '已复制到剪贴板')
  }

  const endpoints = availableEndpoints || []

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          API Key 管理
        </h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
          style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', borderRadius: 'var(--radius)' }}
        >
          + 新建 Key
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : !keys || keys.length === 0 ? (
        <div className="p-8 text-center" style={boxStyle}>
          <p style={{ color: 'var(--text-secondary)' }}>暂无 API Key，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="p-4 flex items-center justify-between" style={boxStyle}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {key.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: key.status === 1 ? '#16a34a20' : '#dc262620',
                      color: key.status === 1 ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {key.status === 1 ? '启用' : '禁用'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <code className="font-mono">{maskKey(key.key)}</code>
                  <button
                    onClick={() => copyKey(key.key)}
                    className="cursor-pointer hover:underline"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    复制
                  </button>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  过期时间: {formatDate(key.expires_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    updateMut.mutate({ id: key.id, data: { status: key.status === 1 ? 0 : 1 } })
                  }}
                  disabled={updateMut.isPending}
                  className="px-3 py-1.5 text-xs cursor-pointer transition hover:brightness-110 disabled:opacity-50"
                  style={{
                    background: key.status === 1 ? '#dc262620' : '#16a34a20',
                    border: key.status === 1 ? '1px solid #dc262640' : '1px solid #16a34a40',
                    borderRadius: 'var(--radius)',
                    color: key.status === 1 ? '#dc2626' : '#16a34a',
                  }}
                >
                  {key.status === 1 ? '禁用' : '启用'}
                </button>
                <button
                  onClick={() => openEdit(key)}
                  className="px-3 py-1.5 text-xs cursor-pointer transition hover:brightness-110"
                  style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}
                >
                  编辑
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定要重置这个 Key 吗？旧 Key 将立即失效。')) {
                      regenerateMut.mutate(key.id)
                    }
                  }}
                  className="px-3 py-1.5 text-xs cursor-pointer transition hover:brightness-110"
                  style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}
                >
                  重置
                </button>
                <button
                  onClick={() => setLogsModal({ open: true, keyId: key.id, keyName: key.name })}
                  className="px-3 py-1.5 text-xs cursor-pointer transition hover:brightness-110"
                  style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}
                >
                  日志
                </button>
                <button
                  onClick={() => {
                    if (confirm('确定要删除这个 Key 吗？此操作不可恢复。')) {
                      deleteMut.mutate(key.id)
                    }
                  }}
                  className="px-3 py-1.5 text-xs cursor-pointer transition hover:brightness-110"
                  style={{ background: '#dc262620', border: '1px solid #dc262640', borderRadius: 'var(--radius)', color: '#dc2626' }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ ...boxStyle, background: 'var(--bg-surface)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {editingId !== null ? '编辑 API Key' : '新建 API Key'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="例如：第三方接入"
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>过期时间（留空=永不过期）</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>可调用的接口</label>
                {endpoints.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>暂无可调用接口</p>
                ) : (
                  <div className="space-y-2">
                    {endpoints.map((ep) => {
                      const perm = form.permissions.find((p) => p.endpoint === ep.endpoint && p.method === ep.method)
                      const checked = !!perm
                      return (
                        <div key={`${ep.method}:${ep.endpoint}`} className="p-3 rounded" style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEndpoint(ep.endpoint, ep.method)}
                              className="cursor-pointer"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {ep.label} <code className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ep.method} {ep.endpoint}</code>
                            </span>
                          </label>
                          {checked && perm && (
                            <div className="flex gap-4 mt-2 ml-6">
                              <div className="flex-1">
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>总调用次数（-1=不限）</label>
                                <input
                                  type="number"
                                  value={perm.quota}
                                  onChange={(e) => updatePermField(ep.endpoint, ep.method, 'quota', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-sm rounded"
                                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>每分钟限流（-1=不限）</label>
                                <input
                                  type="number"
                                  value={perm.rate_limit}
                                  onChange={(e) => updatePermField(ep.endpoint, ep.method, 'rate_limit', Number(e.target.value))}
                                  className="w-full px-2 py-1 text-sm rounded"
                                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm) }}
                className="px-4 py-2 text-sm cursor-pointer transition"
                style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110 disabled:opacity-50"
                style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', borderRadius: 'var(--radius)' }}
              >
                {createMut.isPending || updateMut.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal.open && logsModal.keyId !== null && (
        <ApiKeyLogsModal
          keyId={logsModal.keyId}
          keyName={logsModal.keyName}
          onClose={() => setLogsModal({ open: false, keyId: null, keyName: '' })}
        />
      )}
    </div>
  )
}

function ApiKeyLogsModal({ keyId, keyName, onClose }: { keyId: number; keyName: string; onClose: () => void }) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['api-key-logs', keyId],
    queryFn: () => listApiKeyLogs(keyId),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" style={{ ...boxStyle, background: 'var(--bg-surface)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            调用日志 - {keyName}
          </h3>
          <button
            onClick={onClose}
            className="text-lg cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            &times;
          </button>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
        ) : !logs || logs.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>暂无调用记录</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left py-2 px-2" style={{ color: 'var(--text-secondary)' }}>时间</th>
                <th className="text-left py-2 px-2" style={{ color: 'var(--text-secondary)' }}>接口</th>
                <th className="text-left py-2 px-2" style={{ color: 'var(--text-secondary)' }}>方法</th>
                <th className="text-left py-2 px-2" style={{ color: 'var(--text-secondary)' }}>状态码</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>{new Date(log.created_at).toLocaleString('zh-CN')}</td>
                  <td className="py-2 px-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{log.endpoint}</td>
                  <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{log.method}</td>
                  <td className="py-2 px-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: log.status_code >= 200 && log.status_code < 300 ? '#16a34a20' : '#dc262620',
                        color: log.status_code >= 200 && log.status_code < 300 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {log.status_code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

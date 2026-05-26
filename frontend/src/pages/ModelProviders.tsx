import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  type ProviderResponse,
  type ProviderCreate,
  type ProviderUpdate,
} from '../api/llm'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToastStore } from '../store/toast'

interface FormData {
  name: string
  base_url: string
  model_name: string
  api_key: string
}

const emptyForm: FormData = { name: '', base_url: '', model_name: '', api_key: '' }

export default function ModelProviders() {
  const queryClient = useQueryClient()
  const addToast = useToastStore((s) => s.addToast)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProviderResponse | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<ProviderResponse | null>(null)

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
  })

  const createMut = useMutation({
    mutationFn: (data: ProviderCreate) => createProvider(data),
    onSuccess: () => {
      addToast('success', '添加模型成功')
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      closeForm()
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '添加失败')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProviderUpdate }) => updateProvider(id, data),
    onSuccess: () => {
      addToast('success', '更新模型成功')
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '更新失败')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProvider(id),
    onSuccess: () => {
      addToast('success', '删除模型成功')
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setDeleteTarget(null)
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '删除失败')
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (p: ProviderResponse) => {
    setEditing(p)
    setForm({ name: p.name, base_url: p.base_url, model_name: p.model_name, api_key: '' })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const data: ProviderUpdate = {}
      if (form.name !== editing.name) data.name = form.name
      if (form.base_url !== editing.base_url) data.base_url = form.base_url
      if (form.model_name !== editing.model_name) data.model_name = form.model_name
      if (form.api_key) data.api_key = form.api_key
      updateMut.mutate({ id: editing.id, data })
    } else {
      createMut.mutate(form)
    }
  }

  const inputStyle = {
    background: 'var(--bg-body)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          模型管理
        </h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
          style={{
            background: 'var(--accent-color)',
            color: 'var(--accent-text)',
            borderRadius: 'var(--radius)',
          }}
        >
          添加模型
        </button>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : providers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>暂无模型，点击"添加模型"开始配置</p>
      ) : (
        <div
          className="overflow-x-auto"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <table className="w-full text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>名称</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Base URL</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>模型标识</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>API Key</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.base_url}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.model_name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.api_key_masked}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                      style={{
                        background: 'var(--accent-color)',
                        color: 'var(--accent-text)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                      style={{
                        background: 'var(--bg-body)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeForm} />
          <div
            className="relative w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {editing ? '编辑模型' : '添加模型'}
                </h3>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
                  <input
                    type="text"
                    value={form.base_url}
                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="https://api.deepseek.com/v1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>模型标识</label>
                  <input
                    type="text"
                    value={form.model_name}
                    onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="deepseek-chat"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    API Key {editing && <span style={{ color: 'var(--text-secondary)' }}>(留空则不修改)</span>}
                  </label>
                  <input
                    type="password"
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required={!editing}
                  />
                </div>
              </div>

              <div
                className="flex justify-end gap-3 px-6 py-4"
                style={{ borderTop: '1px solid var(--border-light)' }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm cursor-pointer transition hover:bg-[var(--border-light)]"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {editing ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除确认"
        content={`确定要删除模型「${deleteTarget?.name}」吗？`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSettings,
  listProviders,
  createSetting,
  updateSetting,
  deleteSetting,
  type SettingResponse,
  type SettingCreate,
} from '../api/llm'
import ConfirmDialog from '../components/ConfirmDialog'

interface FormData {
  category: string
  provider_id: number
}

export default function ModelSettings() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SettingResponse | null>(null)
  const [form, setForm] = useState<FormData>({ category: '', provider_id: 0 })
  const [deleteTarget, setDeleteTarget] = useState<SettingResponse | null>(null)

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: listSettings,
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
  })

  const createMut = useMutation({
    mutationFn: (data: SettingCreate) => createSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ category, provider_id }: { category: string; provider_id: number }) =>
      updateSetting(category, { provider_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (category: string) => deleteSetting(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setDeleteTarget(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ category: '', provider_id: providers[0]?.id ?? 0 })
    setFormOpen(true)
  }

  const openEdit = (s: SettingResponse) => {
    setEditing(s)
    setForm({ category: s.category, provider_id: s.provider_id })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateMut.mutate({ category: editing.category, provider_id: form.provider_id })
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

  const categoryLabel: Record<string, string> = {
    chat: 'Chat Model',
    embedding: 'Embedding Model',
    default: '默认模型',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          用途配置
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
          添加配置
        </button>
      </div>

      {/* 卡片列表 */}
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : settings.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>暂无配置，点击"添加配置"开始设置</p>
      ) : (
        <div className="grid gap-4">
          {settings.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: 'var(--accent-color)',
                      color: 'var(--accent-text)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    {s.category}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {categoryLabel[s.category] || s.category}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {s.provider.name} — {s.provider.model_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {s.provider.base_url} | {s.provider.api_key_masked}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  切换模型
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
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
              </div>
            </div>
          ))}
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
                  {editing ? '切换模型' : '添加用途配置'}
                </h3>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>用途类型</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editing.category}
                      className="w-full px-3 py-2 text-sm"
                      style={{ ...inputStyle, opacity: 0.5 }}
                      disabled
                    />
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                      required
                    >
                      <option value="">请选择</option>
                      <option value="chat">chat — Chat Model</option>
                      <option value="embedding">embedding — Embedding Model</option>
                      <option value="default">default — 默认模型</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>选择模型</label>
                  <select
                    value={form.provider_id}
                    onChange={(e) => setForm({ ...form, provider_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                  >
                    <option value={0}>请选择模型</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.model_name})
                      </option>
                    ))}
                  </select>
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
        content={`确定要删除用途「${deleteTarget?.category}」的配置吗？`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.category)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

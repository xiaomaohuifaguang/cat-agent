import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { parseDocument } from '../api/documents'
import { useToastStore } from '../store/toast'

const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function FileParser() {
  const addToast = useToastStore((s) => s.addToast)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')

  const parseMut = useMutation({
    mutationFn: parseDocument,
    onSuccess: (data) => {
      setText(data.text)
      addToast('success', '解析成功')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '解析失败')
    },
  })

  const handleFile = useCallback((selected: File) => {
    if (selected.size > MAX_SIZE_BYTES) {
      addToast('error', `文件过大，最大支持 ${MAX_SIZE_MB}MB`)
      return
    }
    setFile(selected)
    setText('')
  }, [addToast])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(dropped)
    },
    [handleFile]
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) handleFile(selected)
    },
    [handleFile]
  )

  const onParse = () => {
    if (file) parseMut.mutate(file)
  }

  const boxStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  }

  return (
    <div className="flex gap-6 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
      {/* 左侧上传区 */}
      <div className="w-2/5 min-w-0 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          文件解析
        </h2>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center p-8 text-center cursor-pointer transition"
          style={{
            ...boxStyle,
            borderStyle: 'dashed',
            background: 'var(--bg-body)',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept=".txt,.md,.json,.html,.xml,.css,.js"
          />
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            拖拽文件到此处，或点击上传
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            支持 .txt .md .json .html .xml .css .js，最大 {MAX_SIZE_MB}MB
          </p>
        </div>

        {file && (
          <div className="p-4" style={boxStyle}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {file.name}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {(file.size / 1024).toFixed(1)} KB | {file.type || '未知类型'}
            </p>
            <button
              onClick={onParse}
              disabled={parseMut.isPending}
              className="w-full px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110 disabled:opacity-50"
              style={{
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                borderRadius: 'var(--radius)',
              }}
            >
              {parseMut.isPending ? '解析中...' : '开始解析'}
            </button>
          </div>
        )}
      </div>

      {/* 右侧展示区 */}
      <div className="w-3/5 min-w-0 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            解析结果
          </h3>
          {text && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(text)
                addToast('success', '已复制到剪贴板')
              }}
              className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
              style={{
                background: 'var(--bg-body)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
              }}
            >
              复制全文
            </button>
          )}
        </div>

        <div
          className="flex-1 p-4 overflow-y-auto min-w-0"
          style={{
            ...boxStyle,
            background: 'var(--bg-body)',
            maxHeight: 'calc(100vh - 200px)',
          }}
        >
          {parseMut.isPending ? (
            <p style={{ color: 'var(--text-secondary)' }}>解析中...</p>
          ) : text ? (
            <pre
              className="whitespace-pre-wrap text-sm break-all"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', wordBreak: 'break-all', overflowWrap: 'break-word' }}
            >
              {text}
            </pre>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>上传文件后点击解析，结果将显示在此处</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { parseDocument, type ParseResponse, type PageItem, type SheetItem } from '../api/documents'
import { useToastStore } from '../store/toast'

const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

type ViewMode = 'full' | 'pages' | 'sheets'

export default function FileParser() {
  const addToast = useToastStore((s) => s.addToast)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ParseResponse | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const parseMut = useMutation({
    mutationFn: parseDocument,
    onSuccess: (data) => {
      setResult(data)
      setViewMode('full')
      setSelectedIndex(0)
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
    setResult(null)
    setViewMode('full')
    setSelectedIndex(0)
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

  const hasPages = !!result?.pages && result.pages.length > 0
  const hasSheets = !!result?.sheets && result.sheets.length > 0

  const copyContent = () => {
    if (!result) return
    let content = result.text
    if (viewMode === 'pages' && result.pages) {
      content = result.pages[selectedIndex]?.text || ''
    } else if (viewMode === 'sheets' && result.sheets) {
      content = result.sheets[selectedIndex]?.text || ''
    }
    navigator.clipboard.writeText(content)
    addToast('success', '已复制到剪贴板')
  }

  const renderContent = () => {
    if (parseMut.isPending) {
      return <p style={{ color: 'var(--text-secondary)' }}>解析中...</p>
    }
    if (!result) {
      return <p style={{ color: 'var(--text-secondary)' }}>上传文件后点击解析，结果将显示在此处</p>
    }

    let displayText = result.text
    if (viewMode === 'pages' && result.pages) {
      displayText = result.pages[selectedIndex]?.text || ''
    } else if (viewMode === 'sheets' && result.sheets) {
      displayText = result.sheets[selectedIndex]?.text || ''
    }

    return (
      <pre
        className="whitespace-pre-wrap text-sm break-all"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)', wordBreak: 'break-all', overflowWrap: 'break-word' }}
      >
        {displayText}
      </pre>
    )
  }

  const renderSidebar = () => {
    if (!result) return null

    if (viewMode === 'pages' && result.pages) {
      return (
        <div className="flex flex-col gap-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {result.pages.map((page: PageItem, idx: number) => (
            <button
              key={page.page}
              onClick={() => setSelectedIndex(idx)}
              className="text-left px-3 py-2 text-xs rounded transition cursor-pointer"
              style={{
                background: idx === selectedIndex ? 'var(--accent-color)' : 'var(--bg-surface)',
                color: idx === selectedIndex ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              第 {page.page} 页
            </button>
          ))}
        </div>
      )
    }

    if (viewMode === 'sheets' && result.sheets) {
      return (
        <div className="flex flex-col gap-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
          {result.sheets.map((sheet: SheetItem, idx: number) => (
            <button
              key={sheet.name}
              onClick={() => setSelectedIndex(idx)}
              className="text-left px-3 py-2 text-xs rounded transition cursor-pointer"
              style={{
                background: idx === selectedIndex ? 'var(--accent-color)' : 'var(--bg-surface)',
                color: idx === selectedIndex ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex gap-6 overflow-hidden" style={{ height: 'calc(100vh - 140px)' }}>
      {/* 左侧上传区 */}
      <div className="w-2/5 min-w-0 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          文件解析
        </h2>

        <div
          onDragOver={(e) => { if (!parseMut.isPending) e.preventDefault() }}
          onDrop={(e) => { if (!parseMut.isPending) onDrop(e) }}
          className={`flex flex-col items-center justify-center p-8 text-center transition ${parseMut.isPending ? '' : 'cursor-pointer'}`}
          style={{
            ...boxStyle,
            borderStyle: 'dashed',
            background: 'var(--bg-body)',
            opacity: parseMut.isPending ? 0.5 : 1,
          }}
          onClick={() => { if (!parseMut.isPending) document.getElementById('file-input')?.click() }}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            disabled={parseMut.isPending}
            onChange={onFileChange}
            accept=".txt,.md,.json,.html,.xml,.css,.js,.png,.jpg,.jpeg,.gif,.webp,.bmp,.pdf,.docx,.xlsx"
          />
          {parseMut.isPending ? (
            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              解析中，请稍候...
            </p>
          ) : (
            <>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                拖拽文件到此处，或点击上传
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                支持文本、图片等格式，最大 {MAX_SIZE_MB}MB
              </p>
            </>
          )}
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
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            {hasPages && (
              <>
                <button
                  onClick={() => { setViewMode('full'); setSelectedIndex(0) }}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: viewMode === 'full' ? 'var(--accent-color)' : 'var(--bg-body)',
                    color: viewMode === 'full' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  全文
                </button>
                <button
                  onClick={() => { setViewMode('pages'); setSelectedIndex(0) }}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: viewMode === 'pages' ? 'var(--accent-color)' : 'var(--bg-body)',
                    color: viewMode === 'pages' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  分页
                </button>
              </>
            )}
            {hasSheets && (
              <>
                <button
                  onClick={() => { setViewMode('full'); setSelectedIndex(0) }}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: viewMode === 'full' ? 'var(--accent-color)' : 'var(--bg-body)',
                    color: viewMode === 'full' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  全文
                </button>
                <button
                  onClick={() => { setViewMode('sheets'); setSelectedIndex(0) }}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: viewMode === 'sheets' ? 'var(--accent-color)' : 'var(--bg-body)',
                    color: viewMode === 'sheets' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  按 Sheet
                </button>
              </>
            )}
            {result && (
              <button
                onClick={copyContent}
                className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                style={{
                  background: 'var(--bg-body)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                }}
              >
                复制
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-1 min-h-0">
          {/* 结构化侧边栏 */}
          {(viewMode === 'pages' || viewMode === 'sheets') && (
            <div className="w-36 min-w-0 flex flex-col gap-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {viewMode === 'pages' ? '选择页码' : '选择 Sheet'}
              </p>
              {renderSidebar()}
            </div>
          )}

          {/* 内容区 */}
          <div
            className="flex-1 p-4 overflow-y-auto min-w-0"
            style={{
              ...boxStyle,
              background: 'var(--bg-body)',
            }}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

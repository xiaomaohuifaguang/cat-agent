import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  content?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title = '提示',
  content = '',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmedRef = useRef(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  useEffect(() => {
    if (open) {
      confirmedRef.current = false
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleConfirm = () => {
    confirmedRef.current = true
    onConfirm()
  }

  const handleCancel = () => {
    if (!confirmedRef.current) {
      onCancel()
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={handleCancel}
      />

      {/* 弹窗 */}
      <div
        className="relative w-full max-w-sm mx-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          fontFamily: 'var(--font-body)',
          animation: 'dialogIn 0.2s ease-out',
        }}
      >
        <div className="p-6">
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h3>
          {content && (
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {content}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm transition cursor-pointer hover:bg-[var(--border-light)]"
              style={{
                background: 'var(--bg-body)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm transition cursor-pointer hover:brightness-110"
              style={{
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useToastStore } from '../store/toast'

export default function Toast() {
  const toasts = useToastStore((s) => s.toasts)

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}

function ToastItem({ toast }: { toast: { id: string; type: 'success' | 'error'; message: string } }) {
  const [visible, setVisible] = useState(false)
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const bg = toast.type === 'success'
    ? 'rgba(34,197,94,0.95)'
    : 'rgba(239,68,68,0.95)'

  return (
    <div
      className="px-4 py-2.5 text-sm font-medium text-white rounded shadow-lg transition-all duration-300 pointer-events-auto"
      style={{
        background: bg,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-body)',
      }}
      onClick={() => removeToast(toast.id)}
    >
      {toast.message}
    </div>
  )
}
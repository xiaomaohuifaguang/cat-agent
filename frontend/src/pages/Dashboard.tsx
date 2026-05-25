export default function Dashboard() {
  return (
    <div
      className="p-6"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <p style={{ color: 'var(--text-secondary)' }}>
        欢迎进入 CatAgent 系统，后续功能待开发。
      </p>
    </div>
  )
}

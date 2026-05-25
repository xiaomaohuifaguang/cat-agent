import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
}

export default function Layout() {
  const location = useLocation()
  const title = titleMap[location.pathname] || 'CatAgent'

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-body)' }}>
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Header title={title} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

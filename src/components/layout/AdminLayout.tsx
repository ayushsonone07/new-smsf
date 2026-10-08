import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({
  children,
}: AdminLayoutProps) {
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth > 900,
  )
  const [lastPath, setLastPath] = useState(
    location.pathname,
  )

  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)

    if (window.innerWidth <= 900) {
      setSidebarOpen(false)
    }
  }

  return (
    <div
      className={`app-shell${
        sidebarOpen ? ' sidebar-open' : ''
      }`}
    >
      <AdminSidebar
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-content">
        <header className="shell-topbar">
          <button
            type="button"
            className="menu-button"
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>

          <span className="shell-brand">
            SMSF <span>Admin Portal</span>
          </span>
        </header>

        {children}
      </div>
    </div>
  )
}

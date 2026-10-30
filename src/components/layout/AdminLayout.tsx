import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { ProfileChip } from '../common/ProfileChip'
import { useSuperAdminNotifications } from './useSuperAdminNotifications'
import './AdminTheme.css'
import {
  NotificationCenter,
  NotificationsMenu,
} from '../head/layout'

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
  const { items, markAllRead } = useSuperAdminNotifications()

  useEffect(() => {
    if (window.innerWidth <= 900) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSidebarOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <NotificationCenter
      items={items}
      roleLabel="Super Admin"
      onMarkAllRead={markAllRead}
    >
      <div
        className={`app-shell${
          sidebarOpen ? ' sidebar-open' : ''
        }`}
      >
        <AdminSidebar
          onNavigate={() => setSidebarOpen(false)}
          onClose={() => setSidebarOpen(false)}
        />

        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />

        <div className="main-content">
          <header className="shell-topbar">
            <button
              type="button"
              className="menu-button"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>

            <span className="shell-brand">
              <img src="/mbg-card-logo.svg" alt="MBG Card" />
              <span>Admin Portal</span>
            </span>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotificationsMenu />
              <ProfileChip />
            </div>
          </header>

          {children}
        </div>
      </div>
    </NotificationCenter>
  )
}
